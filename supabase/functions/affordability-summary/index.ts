// AI plain-language summary of an affordability assessment.
//
// DECISION-SUPPORT ONLY. This function does NOT decide whether a tenant qualifies
// and does NOT read the raw bank statement. It receives ONLY the deterministic
// engine's already-computed outputs (recommendation, confidence, metrics, reason
// codes, aggregated income/expense categories — no account numbers, names, or
// individual transactions) and rewrites them into plain English for the landlord.
// The model is instructed never to invent figures, never to output an
// approve/reject verdict, and to mirror (not override) the deterministic result.
//
// The financial maths stays 100% in the deterministic engine; the AI only explains.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { generateAffordabilitySummary, SUMMARY_MODEL } from "../_shared/affordability/summarise.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const { applicationId, force, cachedOnly } = await req.json();
    if (!applicationId) throw new Error('applicationId is required');

    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, landlord_id, status, proposed_rent, recommendation, confidence_status, statement_period_start, statement_period_end, output_metrics')
      .eq('application_id', applicationId).maybeSingle();
    if (!assessment) throw new Error('Assessment not found');

    // Staff-only: landlord on the assessment, or an admin.
    const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id });
    const isLandlord = assessment.landlord_id === user.id;
    if (!isLandlord && adminRes !== true) throw new Error('Forbidden');
    const role = isLandlord ? 'landlord' : 'admin';

    if (!['assessment_ready', 'manual_review_required'].includes(assessment.status)) {
      throw new Error('The assessment is not ready to summarise yet.');
    }

    // Return the cached summary unless a regenerate was requested.
    if (!force) {
      const { data: cached } = await supabase
        .from('affordability_ai_summaries')
        .select('summary, model, created_at')
        .eq('assessment_id', assessment.id)
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();
      if (cached?.summary) return json({ summary: cached.summary, model: cached.model, cached: true, createdAt: cached.created_at });
      // Auto-load path: don't spend a generation, just report that none exists yet.
      if (cachedOnly) return json({ summary: null, cached: false });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('AI summaries are not configured (missing LOVABLE_API_KEY).');

    const summary = await generateAffordabilitySummary(supabase, assessment, LOVABLE_API_KEY);

    await supabase.from('affordability_ai_summaries').insert({
      assessment_id: assessment.id, summary, model: SUMMARY_MODEL,
      based_on_recommendation: assessment.recommendation, based_on_confidence: assessment.confidence_status,
      created_by: user.id,
    });
    await supabase.rpc('affordability_audit', { p_assessment: assessment.id, p_event: 'ai_summary_generated', p_actor: user.id, p_role: role, p_detail: { model: SUMMARY_MODEL } });

    return json({ summary, model: SUMMARY_MODEL, cached: false });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-summary error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required|not ready|not configured/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

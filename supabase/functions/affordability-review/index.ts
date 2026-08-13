// Landlord/admin review actions on an affordability assessment. These are
// decision-support actions only and are kept separate from the final rental
// Approve/Decline. An override always requires a reason.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const RECS = ['strong', 'acceptable', 'further_review', 'insufficient'];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const { action, applicationId, note, overrideRecommendation, overrideReason, message } = await req.json();
    if (!action || !applicationId) throw new Error('action and applicationId are required');

    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, landlord_id')
      .eq('application_id', applicationId).maybeSingle();
    if (!assessment) throw new Error('Assessment not found');

    const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id });
    const isLandlord = assessment.landlord_id === user.id;
    if (!isLandlord && adminRes !== true) throw new Error('Forbidden');
    const role = isLandlord ? 'landlord' : 'admin';

    const insertReview = (row: Record<string, unknown>) =>
      supabase.from('affordability_reviews').insert({ assessment_id: assessment.id, reviewer_id: user.id, ...row });
    const audit = (event: string, detail: unknown = null) =>
      supabase.rpc('affordability_audit', { p_assessment: assessment.id, p_event: event, p_actor: user.id, p_role: role, p_detail: detail });
    const notifyTenant = (msg: string) =>
      supabase.rpc('create_notification', {
        _user_id: assessment.tenant_id, _message: msg, _link_url: '/enhancedtenantdashboard',
        _type: 'application', _metadata: { application_id: applicationId },
      });

    switch (action) {
      case 'note': {
        if (!note?.trim()) throw new Error('A note is required');
        await insertReview({ action: 'note', note: note.trim() });
        await audit('review_note_added');
        break;
      }
      case 'mark_reviewed': {
        await insertReview({ action: 'marked_reviewed', note: note?.trim() || null });
        await audit('assessment_marked_reviewed');
        break;
      }
      case 'override': {
        if (!RECS.includes(overrideRecommendation)) throw new Error('A valid recommendation is required');
        if (!overrideReason?.trim()) throw new Error('A reason is required to override the recommendation');
        await insertReview({ action: 'override_recommendation', override_recommendation: overrideRecommendation, override_reason: overrideReason.trim() });
        await audit('recommendation_overridden', { to: overrideRecommendation });
        break;
      }
      case 'request_more_info': {
        await insertReview({ action: 'requested_more_info', note: message?.trim() || null });
        await supabase.from('affordability_assessments').update({ status: 'correction_requested' }).eq('id', assessment.id);
        await notifyTenant('Your landlord has requested more information for your affordability assessment.');
        await audit('requested_more_info');
        break;
      }
      case 'request_another_statement': {
        await insertReview({ action: 'requested_another_statement', note: message?.trim() || null });
        await supabase.from('affordability_assessments').update({ status: 'correction_requested' }).eq('id', assessment.id);
        await notifyTenant('Your landlord has asked for another bank statement for your affordability assessment.');
        await audit('requested_another_statement');
        break;
      }
      default:
        throw new Error('Unknown action');
    }

    return json({ ok: true });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-review error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required|Unknown/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

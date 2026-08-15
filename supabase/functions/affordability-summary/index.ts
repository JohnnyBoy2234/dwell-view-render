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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `You explain rental affordability assessments for MzanziHomes, a South African rental platform, to LANDLORDS. You are given the result of a deterministic (rules-based) affordability engine — you are NOT given the bank statement itself.

Your job is to explain, in plain, calm, professional South African English, what the result means for the proposed rent.

HARD RULES — follow exactly:
- This is decision-support ONLY. NEVER say the applicant is "approved", "rejected", "declined", "accepted", "qualifies" or "does not qualify" as a verdict, and never tell the landlord what to do. The landlord decides.
- Use ONLY the numbers and facts provided. NEVER invent, estimate, round differently, or introduce any figure that is not in the input. If a figure is missing, say it could not be verified.
- Do NOT contradict the engine's recommendation or confidence. Reflect them. If confidence is low or "unable to verify", stress the uncertainty.
- Neutral, non-accusatory tone. Describe risks as things to "verify" or "consider", never as fraud or character judgements.
- All money in South African Rand, written like R12,500.

FORMAT:
- Two short paragraphs (about 3-5 sentences total) summarising affordability for the proposed rent, grounded in the numbers.
- Then "Worth verifying:" followed by up to 3 short bullet points drawn only from the review/negative reason codes and warnings provided (omit the section if there are none).
- End with one sentence: "This is an automated summary to support your decision — it is not a decision or a guarantee."
- No headings other than "Worth verifying:", no markdown bold, no emojis.`;

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

    // Aggregated, PII-minimised inputs — categories + numbers only. No account
    // holder, no account number, no individual transactions, no counterparty names.
    const [reasons, warnings, income, expenses] = await Promise.all([
      supabase.from('affordability_reason_codes').select('code, message, polarity').eq('assessment_id', assessment.id),
      supabase.from('affordability_warnings').select('code, severity, message').eq('assessment_id', assessment.id),
      supabase.from('affordability_income_sources').select('category, average_monthly_amount, months_present, is_verified_recurring').eq('assessment_id', assessment.id),
      supabase.from('affordability_expense_categories').select('category, average_monthly_amount, is_recurring').eq('assessment_id', assessment.id),
    ]);

    const m = (assessment.output_metrics as Record<string, number>) || {};
    const facts = {
      proposed_monthly_rent: assessment.proposed_rent,
      engine_recommendation: assessment.recommendation,
      engine_confidence: assessment.confidence_status,
      statement_period: { from: assessment.statement_period_start, to: assessment.statement_period_end },
      metrics: {
        statement_coverage_months: m.statement_coverage_months,
        verified_monthly_income: m.verified_monthly_income,
        income_is_payroll_verified: m.income_is_payroll_verified,
        income_consistency: m.income_consistency,
        essential_monthly_expenses: m.essential_monthly_expenses,
        recurring_debt_obligations: m.recurring_debt_obligations,
        recurring_financial_commitments: m.recurring_financial_commitments,
        average_monthly_disposable_income: m.average_monthly_disposable_income,
        rent_to_income_ratio: m.rent_to_income_ratio,
        rent_to_disposable_income_ratio: m.rent_to_disposable_income_ratio,
        lowest_monthly_balance: m.lowest_monthly_balance,
        average_closing_balance: m.average_closing_balance,
        account_stress_events: m.account_stress_events,
      },
      income_sources: (income.data || []).map((s: any) => ({ category: s.category, monthly: s.average_monthly_amount, months_present: s.months_present, recurring: s.is_verified_recurring })),
      expense_categories: (expenses.data || []).map((e: any) => ({ category: e.category, monthly: e.average_monthly_amount, recurring: e.is_recurring })),
      positive_findings: (reasons.data || []).filter((r: any) => r.polarity === 'positive').map((r: any) => r.message),
      review_findings: (reasons.data || []).filter((r: any) => r.polarity !== 'positive').map((r: any) => r.message),
      warnings: (warnings.data || []).map((w: any) => w.message),
    };

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Explain this affordability result to the landlord. Use only these facts:\n\n${JSON.stringify(facts, null, 2)}` },
        ],
        stream: false,
      }),
    });

    if (!upstream.ok) {
      const status = upstream.status === 429 ? 429 : 502;
      return json({ error: status === 429 ? 'The AI service is busy — please try again in a moment.' : `AI service error (${upstream.status}).` }, status);
    }

    const data = await upstream.json();
    const summary = (data.choices?.[0]?.message?.content || '').trim();
    if (!summary) throw new Error('No summary was generated. Please try again.');

    await supabase.from('affordability_ai_summaries').insert({
      assessment_id: assessment.id, summary, model: 'google/gemini-2.5-flash',
      based_on_recommendation: assessment.recommendation, based_on_confidence: assessment.confidence_status,
      created_by: user.id,
    });
    await supabase.rpc('affordability_audit', { p_assessment: assessment.id, p_event: 'ai_summary_generated', p_actor: user.id, p_role: role, p_detail: { model: 'google/gemini-2.5-flash' } });

    return json({ summary, model: 'google/gemini-2.5-flash', cached: false });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-summary error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required|not ready|not configured/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

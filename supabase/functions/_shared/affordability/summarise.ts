// Shared summary-generation logic used by the affordability-summary edge
// function. Kept here so any test / alternate caller uses IDENTICAL prompt +
// fact-building + model call (no drift).
//
// DECISION-SUPPORT ONLY. The model receives only the deterministic engine's
// already-computed outputs (recommendation, confidence, metrics, reason codes,
// aggregated income/expense categories) — never the raw statement, account
// number, holder name, or individual transactions — and is instructed never to
// invent figures or output an approve/reject verdict.

export const SUMMARY_SYSTEM_PROMPT = `You explain rental affordability assessments for MzanziHomes, a South African rental platform, to LANDLORDS. You are given the result of a deterministic (rules-based) affordability engine — you are NOT given the bank statement itself.

Your job is to explain, in plain, calm, professional South African English, what the result means for the proposed rent.

HARD RULES — follow exactly:
- This is decision-support ONLY. NEVER say the applicant is "approved", "rejected", "declined", "accepted", "qualifies" or "does not qualify" as a verdict, and never tell the landlord what to do. The landlord decides.
- Use ONLY the numbers and facts provided. NEVER invent, estimate, round differently, or introduce any figure that is not in the input. If a figure is missing, say it could not be verified.
- Do NOT contradict the engine's recommendation or confidence. Reflect them. If confidence is low or "unable to verify", stress the uncertainty.
- Neutral, non-accusatory tone. Describe risks as things to "verify" or "consider", never as fraud or character judgements.
- All money in South African Rand, written like R12,500.

FORMAT:
- Two short paragraphs (about 3-5 sentences total) summarising affordability for the proposed rent, grounded in the numbers.
- Then a line "Worth verifying:" followed by up to 3 short points drawn only from the review/negative reason codes and warnings provided. Put each point on its own line, starting with "- " (a hyphen and a space). Omit the whole section if there are none.
- End with one sentence: "This is an automated summary to support your decision — it is not a decision or a guarantee."
- No headings other than "Worth verifying:", no asterisks, no markdown bold, no emojis.`;

interface SummaryAssessment {
  id: string;
  proposed_rent: number | null;
  recommendation: string | null;
  confidence_status: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  output_metrics: Record<string, number> | null;
}

/** Build the PII-minimised fact object sent to the model. */
export async function buildSummaryFacts(supabase: any, assessment: SummaryAssessment) {
  const [reasons, warnings, income, expenses] = await Promise.all([
    supabase.from('affordability_reason_codes').select('code, message, polarity').eq('assessment_id', assessment.id),
    supabase.from('affordability_warnings').select('code, severity, message').eq('assessment_id', assessment.id),
    supabase.from('affordability_income_sources').select('category, average_monthly_amount, months_present, is_verified_recurring').eq('assessment_id', assessment.id),
    supabase.from('affordability_expense_categories').select('category, average_monthly_amount, is_recurring').eq('assessment_id', assessment.id),
  ]);

  const m = assessment.output_metrics || {};
  return {
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
}

/** Read the assessment's outputs, build facts, call the AI gateway, return the
 *  plain-language summary text. Throws on a hard failure; the caller maps to HTTP. */
export async function generateAffordabilitySummary(
  supabase: any,
  assessment: SummaryAssessment,
  apiKey: string,
): Promise<string> {
  const facts = await buildSummaryFacts(supabase, assessment);

  const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: `Explain this affordability result to the landlord. Use only these facts:\n\n${JSON.stringify(facts, null, 2)}` },
      ],
      stream: false,
    }),
  });

  if (!upstream.ok) {
    const err: any = new Error(upstream.status === 429 ? 'The AI service is busy — please try again in a moment.' : `AI service error (${upstream.status}).`);
    err.status = upstream.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await upstream.json();
  const summary = (data.choices?.[0]?.message?.content || '').trim();
  if (!summary) throw new Error('No summary was generated. Please try again.');
  return summary;
}

export const SUMMARY_MODEL = 'google/gemini-2.5-flash';

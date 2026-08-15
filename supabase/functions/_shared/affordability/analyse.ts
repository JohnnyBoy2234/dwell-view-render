// Deterministic affordability engine: categorise → dedupe/exclude → detect
// recurring income → reconcile → compute metrics → confidence → reason codes →
// recommendation. Pure functions only. Never fabricates amounts; excluded
// transactions (own-transfers, loans, refunds, duplicates) are not counted as
// income. Recommendation bands come from configuration, not hardcoded here.
import type { ParsedStatement, ParsedTransaction } from "./banks.ts";

export interface Rules {
  required_months: number;
  rent_to_income: { strong: number; acceptable: number; review: number };
  rent_to_disposable: { strong: number; acceptable: number; review: number };
  min_income_consistency: number;
}

export interface AnalysedTransaction extends ParsedTransaction {
  category: string;
  subcategory: string | null;
  is_own_account_transfer: boolean;
  is_excluded: boolean;
  exclusion_reason: string | null;
  is_recurring: boolean;
  validation_status: 'validated' | 'low_confidence' | 'failed_validation' | 'requires_review';
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const ym = (d: string | null) => (d ? d.slice(0, 7) : 'unknown');
const has = (s: string, re: RegExp) => re.test(s);

// ---- Deterministic categorisation --------------------------------------------
function categorise(t: ParsedTransaction): {
  category: string; subcategory: string | null; own: boolean; excluded: boolean; reason: string | null;
} {
  const d = (t.description || '').toLowerCase();

  if (has(d, /\b(transfer|xfer|inter.?account|own account|to savings|from savings)\b/)) {
    return { category: 'internal_account_transfer', subcategory: null, own: true, excluded: true, reason: 'own_account_transfer' };
  }
  if (has(d, /\b(reversal|reversed)\b/)) return { category: 'refund', subcategory: 'reversal', own: false, excluded: true, reason: 'reversal' };
  if (has(d, /\brefund\b/)) return { category: 'refund', subcategory: null, own: false, excluded: true, reason: 'refund' };

  if (t.direction === 'credit') {
    if (has(d, /\b(loan|credit advance|cash advance)\b/)) return { category: 'loan_or_credit_advance', subcategory: null, own: false, excluded: true, reason: 'loan_advance' };
    if (has(d, /\b(salary|salaris|sal\b|wages|payroll|remuneration)\b/)) return { category: 'employment_income', subcategory: 'salary', own: false, excluded: false, reason: null };
    if (has(d, /\bpension\b/)) return { category: 'pension', subcategory: null, own: false, excluded: false, reason: null };
    if (has(d, /\b(sassa|grant|uif)\b/)) return { category: 'government_grant', subcategory: null, own: false, excluded: false, reason: null };
    if (has(d, /\binterest\b/)) return { category: 'interest_income', subcategory: null, own: false, excluded: false, reason: null };
    if (has(d, /\b(rent received|rental income)\b/)) return { category: 'rental_income', subcategory: null, own: false, excluded: false, reason: null };
    // Third-party inbound money — real income candidates, but lower certainty than
    // payroll because the source is not an identifiable employer. These reach here
    // only if they were NOT caught as own-account transfers above.
    if (has(d, /\bteletransmission\b|\binward\b/)) return { category: 'deposit_income', subcategory: 'international_inward', own: false, excluded: false, reason: null };
    if (has(d, /\b(cash deposit|instant payment)\b/)) return { category: 'deposit_income', subcategory: 'cash_deposit', own: false, excluded: false, reason: null };
    if (has(d, /\b(magtape|acb credit|eft credit|credit transfer)\b/)) return { category: 'deposit_income', subcategory: 'eft_credit', own: false, excluded: false, reason: null };
    if (has(d, /\bpayshap\b/)) return { category: 'transfer_income', subcategory: 'payshap_inbound', own: false, excluded: false, reason: null };
    if (has(d, /\bpayment from\b/)) return { category: 'transfer_income', subcategory: 'eft_inbound', own: false, excluded: false, reason: null };
    return { category: 'other_income', subcategory: null, own: false, excluded: false, reason: null };
  }

  // Debits
  if (has(d, /\b(rent|bond|home loan)\b/)) return { category: 'rent_or_bond', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(electricity|water|municipal|eskom|prepaid|rates)\b/)) return { category: 'utilities', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(checkers|pick n pay|pnp|woolworths|shoprite|spar|grocer)\b/)) return { category: 'groceries', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(uber|bolt|petrol|fuel|engen|shell|caltex|gautrain|taxi|parking)\b/)) return { category: 'transport', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(insurance|outsurance|santam|momentum|discovery life|funeral)\b/)) return { category: 'insurance', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(pharmacy|clicks|dischem|medical|hospital|medaid|medical aid)\b/)) return { category: 'medical', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(school|tuition|university|college|education)\b/)) return { category: 'education', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(creche|day.?care|childcare)\b/)) return { category: 'childcare', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(credit card|card repayment)\b/)) return { category: 'credit_card_payment', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(loan repayment|loan instal|repayment)\b/)) return { category: 'loan_repayment', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(betway|hollywoodbets|lotto|casino|gambl|sportingbet)\b/)) return { category: 'gambling_related', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(netflix|spotify|dstv|showmax|subscription|apple.com|google)\b/)) return { category: 'subscriptions', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(debit order|do\b)\b/)) return { category: 'debit_order', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(atm|cash withdrawal|withdrawal)\b/)) return { category: 'cash_withdrawal', subcategory: null, own: false, excluded: false, reason: null };
  if (has(d, /\b(fee|charge|admin fee)\b/)) return { category: 'bank_fee', subcategory: null, own: false, excluded: false, reason: null };
  return { category: 'other_expense', subcategory: null, own: false, excluded: false, reason: null };
}

const ESSENTIAL = new Set(['rent_or_bond', 'utilities', 'groceries', 'transport', 'insurance', 'medical', 'education', 'childcare']);
const DEBT = new Set(['credit_card_payment', 'loan_repayment']);
const COMMITMENTS = new Set(['debit_order', 'subscriptions']);
// Income the engine can attribute to an identifiable, reliable source.
const STRONG_INCOME = new Set(['employment_income', 'pension', 'government_grant', 'rental_income']);
// Income that is real but lower-certainty (source not identifiable as an employer).
const SOFT_INCOME = new Set(['transfer_income', 'deposit_income', 'interest_income', 'other_income']);
const normDesc = (d: string) => (d || '').toLowerCase().replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs: number[]) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

export interface AnalysisResult {
  transactions: AnalysedTransaction[];
  metrics: Record<string, number>;
  incomeSources: { label: string; category: string; is_verified_recurring: boolean; average_monthly_amount: number; months_present: number; transaction_ids: string[] }[];
  expenseCategories: { category: string; average_monthly_amount: number; is_recurring: boolean; transaction_ids: string[] }[];
  reconciles: boolean;
  confidence: 'high' | 'medium' | 'low' | 'unable_to_assess';
  warnings: { code: string; severity: string; message: string }[];
  reasonCodes: { code: string; message: string; polarity: string }[];
  recommendation: 'strong' | 'acceptable' | 'further_review' | 'insufficient';
  period_start: string | null;
  period_end: string | null;
}

export function analyse(parsed: ParsedStatement, proposedRent: number | null, rules: Rules): AnalysisResult {
  const warnings: AnalysisResult['warnings'] = [];

  // 1) Categorise + dedupe (same date+amount+description → duplicate).
  const seen = new Set<string>();
  const txns: AnalysedTransaction[] = parsed.transactions.map((t, i) => {
    const c = categorise(t);
    const key = `${t.txn_date}|${t.amount}|${normDesc(t.description)}|${t.direction}`;
    const dup = seen.has(key);
    seen.add(key);
    const lowConf = (t.confidence_score ?? 0) < 0.6 || t.amount == null || !t.txn_date;
    return {
      ...t,
      category: c.category,
      subcategory: c.subcategory,
      is_own_account_transfer: c.own,
      is_excluded: c.excluded || dup,
      exclusion_reason: dup ? 'duplicate' : c.reason,
      is_recurring: false,
      validation_status: dup ? 'requires_review' : lowConf ? 'low_confidence' : 'validated',
    } as AnalysedTransaction;
  });
  const dupCount = txns.filter((t) => t.exclusion_reason === 'duplicate').length;
  if (dupCount) warnings.push({ code: 'duplicate_transactions', severity: 'warning', message: `${dupCount} possible duplicate transaction(s) were excluded.` });

  // 2) Monthly grouping.
  const months = Array.from(new Set(txns.map((t) => ym(t.txn_date)).filter((m) => m !== 'unknown'))).sort();
  const coverage = months.length;

  // 3) Recurring income detection (non-excluded credits recurring across months).
  const incomeTx = txns.filter((t) => t.direction === 'credit' && !t.is_excluded && t.amount != null);
  const groups = new Map<string, AnalysedTransaction[]>();
  for (const t of incomeTx) {
    const k = normDesc(t.description) || t.category;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(t);
  }
  const recurringThreshold = Math.max(2, Math.ceil(coverage * 0.6));
  const incomeSources: AnalysisResult['incomeSources'] = [];
  for (const [label, list] of groups) {
    const monthsPresent = new Set(list.map((t) => ym(t.txn_date))).size;
    const isRecurring = monthsPresent >= recurringThreshold;
    if (isRecurring) list.forEach((t) => (t.is_recurring = true));
    const avg = round2(list.reduce((a, t) => a + (t.amount ?? 0), 0) / Math.max(coverage, 1));
    incomeSources.push({
      label: label || list[0].category,
      category: list[0].category,
      is_verified_recurring: isRecurring,
      average_monthly_amount: avg,
      months_present: monthsPresent,
      transaction_ids: [],
    });
  }

  // 4) Metrics.
  const perMonthCredits = months.map((m) => incomeTx.filter((t) => ym(t.txn_date) === m).reduce((a, t) => a + (t.amount ?? 0), 0));
  const average_monthly_income = round2(mean(perMonthCredits));
  const verified_monthly_income = round2(incomeSources.filter((s) => s.is_verified_recurring).reduce((a, s) => a + s.average_monthly_amount, 0));
  const cv = average_monthly_income > 0 ? stdev(perMonthCredits) / average_monthly_income : 1;
  const income_consistency = round2(Math.max(0, Math.min(1, 1 - cv)));
  const income_source_count = incomeSources.filter((s) => s.is_verified_recurring).length;

  // Income quality: distinguish identifiable payroll-grade income from recurring
  // but lower-certainty transfer/deposit income. Both are counted toward income,
  // but transfer-only income should never read as high confidence.
  const verifiedSources = incomeSources.filter((s) => s.is_verified_recurring);
  const strong_income_monthly = round2(verifiedSources.filter((s) => STRONG_INCOME.has(s.category)).reduce((a, s) => a + s.average_monthly_amount, 0));
  const soft_income_monthly = round2(verifiedSources.filter((s) => SOFT_INCOME.has(s.category)).reduce((a, s) => a + s.average_monthly_amount, 0));
  const income_is_payroll_verified = strong_income_monthly > 0 ? 1 : 0;

  const avgMonthlyBy = (pred: (t: AnalysedTransaction) => boolean) =>
    round2(txns.filter((t) => t.direction === 'debit' && !t.is_excluded && pred(t)).reduce((a, t) => a + (t.amount ?? 0), 0) / Math.max(coverage, 1));
  const essential_monthly_expenses = avgMonthlyBy((t) => ESSENTIAL.has(t.category));
  const recurring_debt_obligations = avgMonthlyBy((t) => DEBT.has(t.category));
  const recurring_financial_commitments = avgMonthlyBy((t) => COMMITMENTS.has(t.category));

  const average_monthly_disposable_income = round2(
    verified_monthly_income - essential_monthly_expenses - recurring_debt_obligations - recurring_financial_commitments
  );

  const balances = txns.map((t) => t.balance_after).filter((b): b is number => b != null);
  const lowest_monthly_balance = balances.length ? round2(Math.min(...balances)) : 0;
  const closingByMonth = months.map((m) => {
    const inMonth = txns.filter((t) => ym(t.txn_date) === m && t.balance_after != null);
    return inMonth.length ? inMonth[inMonth.length - 1].balance_after! : null;
  }).filter((b): b is number => b != null);
  const average_closing_balance = round2(mean(closingByMonth));

  const returned_debit_order_count = txns.filter((t) => has((t.description || '').toLowerCase(), /\b(returned|unpaid|weiering|rd\b|debit order return)\b/)).length;
  const insufficient_funds_count = txns.filter((t) => has((t.description || '').toLowerCase(), /\b(insufficient funds|insuff funds|declined insuff|declined|nsf)\b/)).length;
  const account_stress_events = returned_debit_order_count + insufficient_funds_count;

  const rent = proposedRent ?? 0;
  const rent_to_income_ratio = verified_monthly_income > 0 ? round2(rent / verified_monthly_income) : 0;
  const rent_to_disposable_income_ratio = average_monthly_disposable_income > 0 ? round2(rent / average_monthly_disposable_income) : 0;

  // 5) Reconciliation.
  const creditsSum = txns.filter((t) => t.direction === 'credit').reduce((a, t) => a + (t.amount ?? 0), 0);
  const debitsSum = txns.filter((t) => t.direction === 'debit').reduce((a, t) => a + (t.amount ?? 0), 0);
  let reconciles = true;
  if (parsed.opening_balance != null && parsed.closing_balance != null) {
    const expected = parsed.opening_balance + creditsSum - debitsSum;
    reconciles = Math.abs(expected - parsed.closing_balance) <= 1.0;
    if (!reconciles) warnings.push({ code: 'balance_mismatch', severity: 'potential_integrity', message: 'The extracted transactions did not reconcile with the closing balance.' });
  } else {
    warnings.push({ code: 'balances_missing', severity: 'unable_to_verify', message: 'Opening/closing balance could not be confirmed for full reconciliation.' });
  }

  const lowConfCount = txns.filter((t) => t.validation_status === 'low_confidence').length;
  if (lowConfCount) warnings.push({ code: 'low_confidence_transactions', severity: 'warning', message: `${lowConfCount} transaction(s) had low extraction confidence.` });
  if (coverage < rules.required_months) warnings.push({ code: 'short_period', severity: 'warning', message: `The statement covers ${coverage} month(s); ${rules.required_months} are recommended.` });
  if (verified_monthly_income <= 0) warnings.push({ code: 'no_verified_recurring_income', severity: 'unable_to_verify', message: 'No reliable recurring income was detected.' });
  if (verified_monthly_income > 0 && income_is_payroll_verified === 0) warnings.push({ code: 'income_source_unverified', severity: 'unable_to_verify', message: 'Recurring income appears to come from transfers or deposits rather than an identifiable employer — verify the source and stability of this income.' });
  if (account_stress_events > coverage) warnings.push({ code: 'account_stress', severity: 'warning', message: `${account_stress_events} insufficient-funds or returned-debit event(s) were detected across ${coverage} month(s).` });
  if (lowest_monthly_balance < 0) warnings.push({ code: 'negative_balance', severity: 'warning', message: 'The account balance went negative during the statement period.' });

  // 6) Confidence.
  let confidence: AnalysisResult['confidence'] = 'high';
  if (txns.length === 0 || coverage === 0) confidence = 'unable_to_assess';
  else if (warnings.some((w) => w.severity === 'potential_integrity')) confidence = 'low';
  else if (warnings.some((w) => w.severity === 'unable_to_verify')) confidence = 'medium';
  else if (warnings.length > 0 || coverage < rules.required_months) confidence = 'medium';

  // 7) Recommendation (config bands; worst factor wins). 3=strong…0=insufficient.
  const band = (v: number, b: { strong: number; acceptable: number; review: number }) =>
    v <= b.strong ? 3 : v <= b.acceptable ? 2 : v <= b.review ? 1 : 0;
  const confRank = { high: 3, medium: 2, low: 1, unable_to_assess: 0 }[confidence];
  let rank = Math.min(
    verified_monthly_income > 0 ? band(rent_to_income_ratio, rules.rent_to_income) : 0,
    average_monthly_disposable_income > 0 ? band(rent_to_disposable_income_ratio, rules.rent_to_disposable) : 0,
    confRank,
    coverage >= rules.required_months ? 3 : coverage === rules.required_months - 1 ? 2 : 1,
    income_consistency >= rules.min_income_consistency ? 3 : 1,
    // Income the engine cannot tie to an employer caps the recommendation at
    // "acceptable" — it never reads as a strong, payroll-backed applicant.
    income_is_payroll_verified === 1 ? 3 : verified_monthly_income > 0 ? 2 : 0
  );
  // Account-health caps: frequent bounced debits / insufficient funds and negative
  // balances are strong risk signals regardless of gross income.
  if (account_stress_events > coverage) rank = Math.min(rank, 1);
  if (account_stress_events > coverage * 3) rank = 0;
  if (lowest_monthly_balance < 0 && account_stress_events > coverage) rank = 0;
  if (confidence === 'unable_to_assess') rank = 0;
  const recommendation = (['insufficient', 'further_review', 'acceptable', 'strong'] as const)[rank];

  // 8) Reason codes (explainable, neutral).
  const reasonCodes: AnalysisResult['reasonCodes'] = [];
  const push = (code: string, message: string, polarity: string) => reasonCodes.push({ code, message, polarity });
  if (income_source_count > 0) push('recurring_income_detected', `Recurring income was detected in ${incomeSources.find((s) => s.is_verified_recurring)?.months_present ?? 0} of ${coverage} statement months.`, 'positive');
  if (income_is_payroll_verified === 1) push('payroll_income_identified', 'Income from an identifiable employer/payroll was detected.', 'positive');
  if (verified_monthly_income > 0 && income_is_payroll_verified === 0) push('income_from_transfers', 'Recurring income is from transfers/deposits rather than identifiable payroll — treat as lower certainty and verify the source.', 'review');
  if (account_stress_events > coverage) push('frequent_account_stress', `${account_stress_events} insufficient-funds / returned-debit event(s) across ${coverage} month(s).`, 'negative');
  if (lowest_monthly_balance < 0) push('negative_balance_periods', 'The account went into a negative balance during the statement period.', 'review');
  if (reconciles && parsed.opening_balance != null) push('balances_reconciled', 'No material balance mismatch was detected.', 'positive');
  if (income_consistency < rules.min_income_consistency) push('income_varies', `Income varied significantly between months (consistency ${Math.round(income_consistency * 100)}%).`, 'review');
  if (coverage < rules.required_months) push('short_statement', `The statement covers only ${coverage} month(s).`, 'review');
  if (!reconciles && parsed.opening_balance != null) push('reconcile_failed', 'The extracted transactions did not reconcile with the closing balance.', 'review');
  if (lowConfCount) push('low_confidence_txns', `${lowConfCount} transaction(s) had low classification/extraction confidence.`, 'review');
  if (verified_monthly_income > 0) push('rent_to_income', `Rent is ${Math.round(rent_to_income_ratio * 100)}% of verified recurring income.`, rent_to_income_ratio <= rules.rent_to_income.acceptable ? 'positive' : 'review');
  if (verified_monthly_income <= 0) push('no_verified_income', 'No reliable recurring income could be verified from the statement.', 'negative');

  return {
    transactions: txns,
    metrics: {
      verified_monthly_income, average_monthly_income, income_consistency, income_source_count,
      income_is_payroll_verified, strong_income_monthly, soft_income_monthly,
      essential_monthly_expenses, recurring_debt_obligations, recurring_financial_commitments,
      average_monthly_disposable_income, lowest_monthly_balance, average_closing_balance,
      returned_debit_order_count, insufficient_funds_count, account_stress_events,
      statement_coverage_months: coverage,
      proposed_rent: rent, rent_to_income_ratio, rent_to_disposable_income_ratio,
    },
    incomeSources,
    expenseCategories: aggregateExpenses(txns, coverage),
    reconciles,
    confidence,
    warnings,
    reasonCodes,
    recommendation,
    period_start: parsed.period_start ?? (months[0] ? `${months[0]}-01` : null),
    period_end: parsed.period_end ?? null,
  };
}

function aggregateExpenses(txns: AnalysedTransaction[], coverage: number) {
  const byCat = new Map<string, AnalysedTransaction[]>();
  for (const t of txns) {
    if (t.direction !== 'debit' || t.is_excluded) continue;
    (byCat.get(t.category) ?? byCat.set(t.category, []).get(t.category)!).push(t);
  }
  return Array.from(byCat.entries()).map(([category, list]) => ({
    category,
    average_monthly_amount: round2(list.reduce((a, t) => a + (t.amount ?? 0), 0) / Math.max(coverage, 1)),
    is_recurring: COMMITMENTS.has(category) || DEBT.has(category),
    transaction_ids: [],
  }));
}

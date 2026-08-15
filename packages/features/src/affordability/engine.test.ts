import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
// The deterministic engine + parser live with the edge pipeline (Deno), but are
// pure TypeScript with no Deno/HTTP imports, so they run under Vitest too.
import { capitecParser } from '../../../../supabase/functions/_shared/affordability/parsers/capitec.ts';
import { standardBankParser } from '../../../../supabase/functions/_shared/affordability/parsers/standardbank.ts';
import { analyse } from '../../../../supabase/functions/_shared/affordability/analyse.ts';

const RULES = {
  required_months: 3,
  rent_to_income: { strong: 0.3, acceptable: 0.4, review: 0.5 },
  rent_to_disposable: { strong: 0.4, acceptable: 0.6, review: 0.8 },
  min_income_consistency: 0.6,
};

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = readFileSync(
  path.join(here, '../../../../supabase/functions/_shared/affordability/fixtures/capitec-employed.txt'),
  'utf8'
);

describe('Capitec parser', () => {
  it('detects the bank and extracts statement metadata', () => {
    expect(capitecParser.matches(fixture)).toBe(true);
    const parsed = capitecParser.parse([{ page_number: 1, text: fixture }], fixture);
    expect(parsed.bank).toBe('Capitec');
    expect(parsed.opening_balance).toBe(5000);
    expect(parsed.closing_balance).toBe(26003);
    expect(parsed.transactions).toHaveLength(18);
  });

  it('infers direction + amount from the balance delta', () => {
    const parsed = capitecParser.parse([{ page_number: 1, text: fixture }], fixture);
    const salary = parsed.transactions.filter((t) => /salary/i.test(t.description));
    expect(salary).toHaveLength(3);
    expect(salary[0].direction).toBe('credit');
    expect(salary[0].amount).toBe(18500);
    const rent = parsed.transactions.find((t) => /rent/i.test(t.description))!;
    expect(rent.direction).toBe('debit');
    expect(rent.amount).toBe(6000);
  });
});

describe('affordability engine', () => {
  const parsed = capitecParser.parse([{ page_number: 1, text: fixture }], fixture);
  const result = analyse(parsed, 6000, RULES);

  it('reconciles opening + credits - debits with the closing balance', () => {
    expect(result.reconciles).toBe(true);
  });

  it('computes deterministic metrics and excludes non-income correctly', () => {
    expect(result.metrics.statement_coverage_months).toBe(3);
    expect(result.metrics.verified_monthly_income).toBe(18500);
    expect(result.metrics.essential_monthly_expenses).toBe(10600); // rent+groceries+transport+utilities
    expect(result.metrics.recurring_financial_commitments).toBe(899); // DSTV subscription
    expect(result.metrics.average_monthly_disposable_income).toBe(7001);
    expect(result.metrics.rent_to_income_ratio).toBeCloseTo(0.32, 2);
  });

  it('reports high confidence for a clean, reconciling statement', () => {
    expect(result.confidence).toBe('high');
    expect(result.reasonCodes.some((r) => r.polarity === 'positive')).toBe(true);
  });
});

// Build a ParsedStatement from concise transaction tuples for engine unit tests.
type Tup = [date: string, desc: string, dir: 'credit' | 'debit', amount: number, bal: number];
function statement(opening: number, closing: number, rows: Tup[]) {
  return {
    bank: 'Test Bank', account_holder: null, masked_account: null,
    period_start: rows[0][0], period_end: rows[rows.length - 1][0],
    opening_balance: opening, closing_balance: closing,
    transactions: rows.map(([txn_date, description, direction, amount, bal], i) => ({
      txn_date, value_date: txn_date, description, amount, direction,
      balance_after: bal, source_page: 1, raw_text: description, confidence_score: 0.98,
    })),
    confidence: 1,
  };
}

describe('income quality — transfer/deposit-only income', () => {
  // Income arrives only as inbound EFTs (no identifiable payroll), balances healthy.
  const parsed = statement(1000, 16000, [
    ['2026-02-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 9000],
    ['2026-02-03', 'CHECKERS GROCERIES', 'debit', 2000, 7000],
    ['2026-02-05', 'DL UBER', 'debit', 1000, 6000],
    ['2026-03-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 14000],
    ['2026-03-03', 'CHECKERS GROCERIES', 'debit', 2000, 12000],
    ['2026-03-05', 'DL UBER', 'debit', 1000, 11000],
    ['2026-04-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 19000],
    ['2026-04-03', 'CHECKERS GROCERIES', 'debit', 2000, 17000],
    ['2026-04-05', 'DL UBER', 'debit', 1000, 16000],
  ]);
  const result = analyse(parsed, 2000, RULES);

  it('counts the income but never as identifiable payroll', () => {
    expect(result.metrics.verified_monthly_income).toBe(8000);
    expect(result.metrics.income_is_payroll_verified).toBe(0);
    expect(result.metrics.soft_income_monthly).toBe(8000);
    expect(result.metrics.strong_income_monthly).toBe(0);
  });

  it('caps confidence below high and flags the source', () => {
    expect(result.confidence).not.toBe('high');
    expect(result.recommendation).not.toBe('strong');
    expect(result.reasonCodes.some((r) => r.code === 'income_from_transfers')).toBe(true);
    expect(result.reasonCodes.some((r) => r.code === 'payroll_income_identified')).toBe(false);
  });
});

describe('account health — frequent stress + negative balance', () => {
  const rows: Tup[] = [
    ['2026-02-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 9000],
    ['2026-02-03', 'CHECKERS GROCERIES', 'debit', 2000, 7000],
    ['2026-02-06', 'ADOBE FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 6991.5],
    ['2026-02-07', 'UBER FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 6983],
    ['2026-02-08', 'AMAZON FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 6974.5],
    ['2026-03-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 14974.5],
    ['2026-03-03', 'CHECKERS GROCERIES', 'debit', 2000, 12974.5],
    ['2026-03-06', 'ADOBE FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 12966],
    ['2026-03-07', 'UBER FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 12957.5],
    ['2026-03-08', 'AMAZON FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 12949],
    ['2026-04-02', 'DEDDIE IB PAYMENT FROM', 'credit', 8000, 20949],
    ['2026-04-03', 'CHECKERS GROCERIES', 'debit', 2000, 18949],
    ['2026-04-06', 'ADOBE FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 18940.5],
    ['2026-04-07', 'UBER FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 18932],
    ['2026-04-08', 'AMAZON FEE- POS DECLINED INSUFF FUNDS', 'debit', 8.5, 18923.5],
    ['2026-04-09', 'U*TICKETMASTE DEBIT CARD PURCHASE FROM', 'debit', 19000, -76.5],
  ];
  const parsed = statement(1000, -76.5, rows);
  const result = analyse(parsed, 2000, RULES);

  it('detects the stress events and the negative balance', () => {
    expect(result.metrics.account_stress_events).toBe(9);
    expect(result.metrics.lowest_monthly_balance).toBeLessThan(0);
    expect(result.warnings.some((w) => w.code === 'account_stress')).toBe(true);
    expect(result.warnings.some((w) => w.code === 'negative_balance')).toBe(true);
  });

  it('caps the recommendation to further_review or worse', () => {
    expect(['further_review', 'insufficient']).toContain(result.recommendation);
    expect(result.reasonCodes.some((r) => r.code === 'frequent_account_stress')).toBe(true);
    expect(result.reasonCodes.some((r) => r.code === 'negative_balance_periods')).toBe(true);
  });
});

describe('Standard Bank parser', () => {
  const sb = readFileSync(
    path.join(here, '../../../../supabase/functions/_shared/affordability/fixtures/standardbank-employed.txt'),
    'utf8'
  );

  it('detects the bank, DD/MM/YYYY dates and brought/carried-forward balances', () => {
    expect(standardBankParser.matches(sb)).toBe(true);
    const parsed = standardBankParser.parse([{ page_number: 1, text: sb }], sb);
    expect(parsed.bank).toBe('Standard Bank');
    expect(parsed.opening_balance).toBe(5000);
    expect(parsed.closing_balance).toBe(26003);
    expect(parsed.transactions).toHaveLength(18);
    const salary = parsed.transactions.filter((t) => /salary/i.test(t.description));
    expect(salary).toHaveLength(3);
    expect(salary[0].direction).toBe('credit');
    expect(salary[0].amount).toBe(18500);
  });

  it('runs the engine end-to-end and reconciles', () => {
    const parsed = standardBankParser.parse([{ page_number: 1, text: sb }], sb);
    const result = analyse(parsed, 6000, RULES);
    expect(result.reconciles).toBe(true);
    expect(result.metrics.verified_monthly_income).toBe(18500);
    expect(result.metrics.statement_coverage_months).toBe(3);
    expect(result.confidence).toBe('high');
  });
});

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

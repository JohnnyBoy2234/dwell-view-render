// Extensible bank-statement parser architecture + bank detection.
//
//   BaseStatementParser (interface)
//     ├── FNBStatementParser        (registered in Stage 5)
//     ├── CapitecStatementParser    (registered in Stage 5)
//     ├── ABSAStatementParser
//     ├── StandardBankStatementParser
//     └── NedbankStatementParser
//
// Bank detection is intentionally separate from parsing: we never silently guess
// a format. If a bank is recognised but has no registered parser (or none is
// recognised), the pipeline routes to manual review.

export interface ParsedTransaction {
  txn_date: string | null;
  value_date: string | null;
  description: string;
  amount: number | null;
  direction: 'credit' | 'debit' | 'unknown';
  balance_after: number | null;
  source_page: number | null;
  raw_text: string;
  confidence_score: number;
}

export interface ParsedStatement {
  bank: string;
  account_holder?: string | null;
  masked_account?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  opening_balance?: number | null;
  closing_balance?: number | null;
  transactions: ParsedTransaction[];
  confidence: number;
}

export interface StatementPage { page_number: number; text: string }

export interface StatementParser {
  bank: string;
  /** Cheap check on the full text to decide whether this parser applies. */
  matches(fullText: string): boolean;
  /** Extract account/statement metadata + transactions. */
  parse(pages: StatementPage[], fullText: string): ParsedStatement;
}

const REGISTRY: StatementParser[] = [
  // Concrete parsers are registered here in Stage 5, e.g.:
  //   import { capitecParser } from "./parsers/capitec.ts"; REGISTRY.push(capitecParser);
];

export function registerParser(p: StatementParser): void {
  if (!REGISTRY.some((r) => r.bank === p.bank)) REGISTRY.push(p);
}

export function findParser(fullText: string): StatementParser | null {
  return REGISTRY.find((p) => p.matches(fullText)) ?? null;
}

const BANK_SIGNATURES: { name: string; re: RegExp }[] = [
  { name: 'Capitec', re: /capitec/i },
  { name: 'FNB', re: /\bFNB\b|first\s+national\s+bank/i },
  { name: 'ABSA', re: /\babsa\b/i },
  { name: 'Standard Bank', re: /standard\s+bank/i },
  { name: 'Nedbank', re: /nedbank/i },
];

/** Best-effort bank name detection (independent of parser availability). */
export function detectBank(fullText: string): string | null {
  for (const s of BANK_SIGNATURES) if (s.re.test(fullText)) return s.name;
  return null;
}

// Standard Bank statement parser.
//
// Tuned against a real Standard Bank "3 month statement" (MyMoAcc) PDF text layer.
// The layout that this parser handles (and that the single-line generic parser did
// NOT):
//   - Two amount columns — Payments (printed negative) and Deposits (positive) —
//     which the PDF text layer flattens into one "<amount> <balance>" line.
//   - Dates are "DD Mon YY" (2-digit year). The branch-stamp date "DD Mon YYYY"
//     (4-digit year) must NOT be mistaken for a transaction date.
//   - Each transaction spans 2–3 extracted lines:
//         "<DD Mon YY> <main description>"
//         "<subtitle / wrapped description>"      (0..n lines)
//         "<amount> <balance>"                     (closes the transaction)
//   - Opening balance from "STATEMENT OPENING BALANCE <balance>".
//   - Amounts use commas as thousands separators; balances may be negative.
//
// Direction comes from the printed sign of the amount and is cross-checked against
// the running-balance delta to score per-row confidence (a mismatch is a strong
// signal that a row was mis-parsed and should not be trusted).
import { registerParser } from "../banks.ts";
import type { ParsedStatement, ParsedTransaction, StatementPage, StatementParser } from "../banks.ts";

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const num = (s: string | undefined | null): number | null => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[\sR,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// "DD Mon YY" (2-digit year) → ISO. Also tolerates "DD Mon YYYY" and DD/MM/YYYY.
function toISO(d: string): string | null {
  d = d.trim();
  let m = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(d);
  if (m) { const mon = MONTHS[m[2].slice(0, 3).toLowerCase()]; if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`; }
  m = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2})$/.exec(d);
  if (m) { const mon = MONTHS[m[2].slice(0, 3).toLowerCase()]; if (mon) return `20${m[3]}-${mon}-${m[1].padStart(2, '0')}`; }
  m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

// A transaction row starts with "DD Mon YY" (2-digit year NOT followed by a third
// digit — this excludes the "DD Mon YYYY" branch-stamp date).
const DATE_START = /^(\d{1,2}\s[A-Za-z]{3}\s\d{2})(?!\d)\s*(.*)$/;
// The line that closes a transaction: "<amount> <balance>" (both signed decimals).
const AMOUNT_BAL = /^(-?[\d,]+\.\d{2})\s+(-?[\d,]+\.\d{2})$/;

// Fixed page furniture that can appear between transactions. Kept deliberately
// specific so it never swallows a real (often all-caps) transaction subtitle such
// as "IB TRANSFER FROM" or "DEBIT CARD PURCHASE FROM".
const NOISE = [
  /customer care/i, /standardbank\.co\.za/i, /^website:/i, /^3 month statement/i,
  /^from:\s*\d/i, /^to:\s*\d/i, /^account\s*(number|holder)/i, /^product name/i,
  /reg\.?\s*no/i, /we subscribe/i, /ombudsman/i, /^pg\s*\d+\s*of\s*\d+/i,
  /^transaction details/i, /available balance/i, /^date\s+description/i,
  /statement summary/i, /please verify all/i, /today's debits/i,
];
const isNoise = (line: string) => NOISE.some((re) => re.test(line));

const field = (text: string, re: RegExp) => { const m = re.exec(text); return m ? m[1].trim() : null; };

const standardBankParser: StatementParser = {
  bank: 'Standard Bank',
  matches: (fullText) => /standard\s*bank/i.test(fullText),

  parse(pages: StatementPage[], fullText: string): ParsedStatement {
    // Capture the holder name only, stopping before the address digits (the PDF
    // flattens the right-hand address block onto the account-holder line).
    const account_holder = field(fullText, /Account\s*holder\s*:?\s*([A-Za-z.][A-Za-z. ']+?)(?=\s+\d|\s{2,}|\n|$)/i);
    const rawAcct = field(fullText, /Account\s*number\s*:?\s*(\d[\d ]*\d)/i);
    const masked_account = rawAcct ? rawAcct.replace(/\s/g, '').replace(/.(?=.{4})/g, '*') : null;

    const from = field(fullText, /From:\s*(\d{1,2}\s[A-Za-z]{3}\s\d{2,4})/i);
    const to = field(fullText, /To:\s*(\d{1,2}\s[A-Za-z]{3}\s\d{2,4})/i);
    const period_start = from ? toISO(from) : null;
    const period_end = to ? toISO(to) : null;

    const opening_balance = num(field(fullText, /STATEMENT\s+OPENING\s+BALANCE\s+(-?[\d,]+\.\d{2})/i));

    const transactions: ParsedTransaction[] = [];
    let prevBalance = opening_balance;

    // Line-based state machine: accumulate description lines from a date line up to
    // the "<amount> <balance>" line that closes the transaction.
    let pending: { date: string; page: number; desc: string[] } | null = null;
    const flushRow = (amountRaw: number, balance: number) => {
      if (!pending) return;
      const description = pending.desc.join(' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      const direction: ParsedTransaction['direction'] = amountRaw < 0 ? 'debit' : 'credit';
      const amount = Math.abs(amountRaw);
      // Cross-check the printed amount against the balance movement.
      let confidence = 0.85;
      if (prevBalance != null) {
        const delta = Math.round((balance - prevBalance) * 100) / 100;
        confidence = Math.abs(delta - amountRaw) <= 0.02 ? 0.98 : 0.6;
      }
      transactions.push({
        txn_date: pending.date, value_date: pending.date, description,
        amount, direction, balance_after: balance,
        source_page: pending.page,
        raw_text: `${description} ${amountRaw.toFixed(2)} ${balance.toFixed(2)}`.slice(0, 300),
        confidence_score: confidence,
      });
      prevBalance = balance;
      pending = null;
    };

    for (const page of pages) {
      for (const rawLine of page.text.split('\n')) {
        const line = rawLine.trim();
        if (!line) continue;

        // A date line always begins a new transaction (dropping any previous
        // pending row that never found its amount line — defensive).
        const ds = DATE_START.exec(line);
        if (ds) {
          const iso = toISO(ds[1]);
          if (iso) { pending = { date: iso, page: page.page_number, desc: ds[2] ? [ds[2]] : [] }; continue; }
        }

        if (pending) {
          const ab = AMOUNT_BAL.exec(line);
          if (ab) { flushRow(num(ab[1])!, num(ab[2])!); continue; }
          if (!isNoise(line)) pending.desc.push(line);
          continue;
        }
        // Outside a transaction and not a date line → page furniture; ignore.
      }
    }

    const closing_balance = transactions.length
      ? transactions[transactions.length - 1].balance_after
      : num(field(fullText, /Available\s*Balance\s*:?\s*-?R\s*([\d,]+\.\d{2})/i));

    const highConf = transactions.filter((t) => t.confidence_score >= 0.9).length;
    return {
      bank: 'Standard Bank', account_holder, masked_account, period_start, period_end,
      opening_balance, closing_balance, transactions,
      confidence: transactions.length ? highConf / transactions.length : 0,
    };
  },
};

registerParser(standardBankParser);
export { standardBankParser };

// Capitec statement parser (first concrete parser; validated against synthetic
// fixtures — a real redacted sample should be used to tune it before production).
//
// Direction + amount are derived from the running balance delta (authoritative
// and reconcilable) and cross-checked against the printed amount to score
// per-transaction confidence. This avoids brittle column-position parsing after
// the PDF text layer is flattened.
import { registerParser } from "../banks.ts";
import type { ParsedStatement, ParsedTransaction, StatementPage, StatementParser } from "../banks.ts";

const num = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[\s,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const toISO = (d: string): string | null => {
  // Accept YYYY/MM/DD or DD/MM/YYYY.
  let m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(d);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
};

const findField = (text: string, re: RegExp): string | null => {
  const m = re.exec(text);
  return m ? m[1].trim() : null;
};

// Transaction row: date, description, printed amount (signed), balance-after.
const ROW = /^(\d{4}\/\d{2}\/\d{2}|\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?[\d\s,]+\.\d{2})\s+(-?[\d\s,]+\.\d{2})\s*$/;

const capitecParser: StatementParser = {
  bank: 'Capitec',
  matches: (fullText) => /capitec/i.test(fullText),

  parse(pages: StatementPage[], fullText: string): ParsedStatement {
    const account_holder = findField(fullText, /Account\s*Holder\s*:?\s*([A-Za-z ,.'-]+)/i);
    const rawAcct = findField(fullText, /Account\s*Number\s*:?\s*([\dxX*\s-]+)/i);
    const masked_account = rawAcct ? rawAcct.replace(/\s/g, '').replace(/.(?=.{4})/g, '*') : null;
    const period = /Statement\s*Period\s*:?\s*(\d{4}\/\d{2}\/\d{2}|\d{2}\/\d{2}\/\d{4})\s*(?:to|-|–)\s*(\d{4}\/\d{2}\/\d{2}|\d{2}\/\d{2}\/\d{4})/i.exec(fullText);
    const period_start = period ? toISO(period[1]) : null;
    const period_end = period ? toISO(period[2]) : null;
    const opening_balance = num(findField(fullText, /Opening\s*Balance\s*:?\s*(-?[\d\s,]+\.\d{2})/i));
    const closing_balance = num(findField(fullText, /Closing\s*Balance\s*:?\s*(-?[\d\s,]+\.\d{2})/i));

    const transactions: ParsedTransaction[] = [];
    let prevBalance = opening_balance;

    for (const page of pages) {
      for (const rawLine of page.text.split('\n')) {
        const line = rawLine.trim();
        const m = ROW.exec(line);
        if (!m) continue;
        const date = toISO(m[1]);
        const description = m[2].replace(/\s+/g, ' ').trim();
        const printed = num(m[3]);
        const balance_after = num(m[4]);

        // Derive amount + direction from the balance delta (authoritative).
        let amount: number | null = printed != null ? Math.abs(printed) : null;
        let direction: ParsedTransaction['direction'] = 'unknown';
        let confidence = printed != null ? 0.7 : 0.5;

        if (balance_after != null && prevBalance != null) {
          const delta = Math.round((balance_after - prevBalance) * 100) / 100;
          const derived = Math.abs(delta);
          direction = delta >= 0 ? 'credit' : 'debit';
          amount = derived;
          // Cross-check with the printed amount → higher confidence when they agree.
          confidence = printed != null && Math.abs(derived - Math.abs(printed)) <= 0.02 ? 0.98 : 0.75;
        } else if (printed != null) {
          direction = printed >= 0 ? 'credit' : 'debit';
        }

        transactions.push({
          txn_date: date,
          value_date: date,
          description,
          amount,
          direction,
          balance_after,
          source_page: page.page_number,
          raw_text: line.slice(0, 300),
          confidence_score: confidence,
        });
        if (balance_after != null) prevBalance = balance_after;
      }
    }

    // Overall parse confidence: fraction of rows that reconciled with printed amounts.
    const highConf = transactions.filter((t) => t.confidence_score >= 0.9).length;
    const confidence = transactions.length ? highConf / transactions.length : 0;

    return {
      bank: 'Capitec',
      account_holder,
      masked_account,
      period_start,
      period_end,
      opening_balance,
      closing_balance,
      transactions,
      confidence,
    };
  },
};

registerParser(capitecParser);
export { capitecParser };

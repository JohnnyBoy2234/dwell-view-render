// Standard Bank statement parser.
//
// Built against the common Standard Bank layout (labels "Balance Brought/Carried
// Forward", DD/MM/YYYY dates). Direction + amount come from the running-balance
// delta, so it tolerates single- vs split debit/credit columns. Validate against
// a real redacted statement and tune the header/date regexes as needed.
import { registerParser } from "../banks.ts";
import type { ParsedStatement, ParsedTransaction, StatementPage, StatementParser } from "../banks.ts";

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const num = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const n = Number(s.replace(/[\s,]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// Accepts YYYY/MM/DD, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "DD Mon YYYY", "DD Month YYYY".
function toISO(d: string): string | null {
  d = d.trim();
  let m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(d);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(d);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(d);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const DATE = '(\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4}|\\d{1,2}\\s+[A-Za-z]{3,}\\s+\\d{4})';
// Date, description, then 1–3 trailing money amounts (last = balance).
const ROW = new RegExp(`^(${DATE})\\s+(.+?)((?:\\s+-?[\\d,]+\\.\\d{2}){1,3})\\s*$`);

const field = (text: string, re: RegExp) => { const m = re.exec(text); return m ? m[1].trim() : null; };

const standardBankParser: StatementParser = {
  bank: 'Standard Bank',
  matches: (fullText) => /standard\s*bank/i.test(fullText),

  parse(pages: StatementPage[], fullText: string): ParsedStatement {
    const account_holder = field(fullText, /Account\s*Holder\s*:?\s*([A-Za-z ,.'-]+)/i);
    const rawAcct = field(fullText, /Account\s*(?:Number|No\.?)\s*:?\s*([\dxX*\s-]+)/i);
    const masked_account = rawAcct ? rawAcct.replace(/\s/g, '').replace(/.(?=.{4})/g, '*') : null;

    const period = new RegExp(`(?:Statement\\s*Period|From)\\s*:?\\s*(${DATE})\\s*(?:to|-|–|until)\\s*(${DATE})`, 'i').exec(fullText);
    const period_start = period ? toISO(period[1]) : null;
    const period_end = period ? toISO(period[3] ?? period[2]) : null;

    const opening_balance = num(field(fullText, /(?:Opening\s*Balance|Balance\s*Brought\s*Forward)\s*:?\s*(-?[\d\s,]+\.\d{2})/i));
    const closing_balance = num(field(fullText, /(?:Closing\s*Balance|Balance\s*Carried\s*Forward)\s*:?\s*(-?[\d\s,]+\.\d{2})/i));

    const transactions: ParsedTransaction[] = [];
    let prevBalance = opening_balance;

    for (const page of pages) {
      for (const rawLine of page.text.split('\n')) {
        const line = rawLine.trim();
        const m = ROW.exec(line);
        if (!m) continue;
        const date = toISO(m[1]);
        if (!date) continue;
        const description = m[3].replace(/\s+/g, ' ').trim();
        const nums = (m[4].match(/-?[\d,]+\.\d{2}/g) || []).map((x) => num(x)).filter((n): n is number => n != null);
        if (nums.length === 0) continue;
        const balance_after = nums[nums.length - 1];
        const printed = nums.length >= 2 ? Math.abs(nums[nums.length - 2]) : null;

        let amount: number | null = printed;
        let direction: ParsedTransaction['direction'] = 'unknown';
        let confidence = printed != null ? 0.7 : 0.5;
        if (balance_after != null && prevBalance != null) {
          const delta = Math.round((balance_after - prevBalance) * 100) / 100;
          amount = Math.abs(delta);
          direction = delta >= 0 ? 'credit' : 'debit';
          confidence = printed != null && Math.abs(amount - printed) <= 0.02 ? 0.98 : 0.75;
        }

        transactions.push({
          txn_date: date, value_date: date, description, amount, direction,
          balance_after, source_page: page.page_number, raw_text: line.slice(0, 300),
          confidence_score: confidence,
        });
        if (balance_after != null) prevBalance = balance_after;
      }
    }

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

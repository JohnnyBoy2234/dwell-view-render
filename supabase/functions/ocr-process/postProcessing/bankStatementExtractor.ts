import type { NormalizedOcrResult } from '../types.ts';
import type { DocumentPostProcessor } from './types.ts';

// TODO(bank-statement-extraction): bank name, account holder, statement
// period, address, transaction text, possible recurring income. Table-aware
// parsing (transactions) is a meaningfully bigger effort than the other
// extractors here — don't attempt line-by-line guessing without it.
export const bankStatementExtractor: DocumentPostProcessor = {
  supports: (documentType) => documentType === 'bank_statement',
  process: (result: NormalizedOcrResult) => Promise.resolve({ text: result.rawText })
};

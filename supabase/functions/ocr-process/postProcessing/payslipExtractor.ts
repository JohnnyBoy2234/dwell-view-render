import type { NormalizedOcrResult } from '../types.ts';
import type { DocumentPostProcessor } from './types.ts';

// TODO(payslip-extraction): employee name, employer, pay period, gross
// income, net income, deductions. All candidates for review — never treated
// as verified income for affordability decisions.
export const payslipExtractor: DocumentPostProcessor = {
  supports: (documentType) => documentType === 'payslip',
  process: (result: NormalizedOcrResult) => Promise.resolve({ text: result.rawText })
};

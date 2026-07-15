import type { NormalizedOcrResult } from '../types.ts';
import type { DocumentPostProcessor } from './types.ts';

// TODO(sa-id-extraction): full names, surname, SA ID number, date of birth,
// citizenship. Mirror packages/common/src/utils/saId.ts for the checksum and
// century-pivot logic already proven there — do not reimplement it here.
// Every field stays a review candidate; never treat a checksum pass as
// identity verification.
export const saIdExtractor: DocumentPostProcessor = {
  supports: (documentType) => documentType === 'sa_id',
  process: (result: NormalizedOcrResult) => Promise.resolve({ text: result.rawText })
};

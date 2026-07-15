import type { NormalizedOcrResult } from '../types.ts';
import type { DocumentPostProcessor } from './types.ts';

// TODO(rental-application-extraction): applicant name, identity number,
// contact details, current address, employer, income, references — for a
// tenant-supplied prior rental-application PDF (e.g. from another agent),
// not this application's own submission.
export const rentalApplicationExtractor: DocumentPostProcessor = {
  supports: (documentType) => documentType === 'rental_application',
  process: (result: NormalizedOcrResult) => Promise.resolve({ text: result.rawText })
};

import type { NormalizedOcrResult, RentalDocumentType } from '../types.ts';

// Every extractor returns candidates, never verified facts — the caller
// (applicant review screen) always requires confirmation before any value
// reaches the rental-application record.
export interface DocumentPostProcessor<T = Record<string, unknown>> {
  supports(documentType: RentalDocumentType): boolean;
  process(result: NormalizedOcrResult): Promise<T>;
}

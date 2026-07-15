import type { NormalizedOcrResult, RentalDocumentType } from '../types.ts';
import { bankStatementExtractor } from './bankStatementExtractor.ts';
import { payslipExtractor } from './payslipExtractor.ts';
import { rentalApplicationExtractor } from './rentalApplicationExtractor.ts';
import { saIdExtractor } from './saIdExtractor.ts';

const extractors = [saIdExtractor, payslipExtractor, bankStatementExtractor, rentalApplicationExtractor];

export async function runPostProcessing(
  documentType: RentalDocumentType,
  result: NormalizedOcrResult
): Promise<Record<string, unknown>> {
  const extractor = extractors.find((e) => e.supports(documentType));
  return extractor ? extractor.process(result) : { text: result.rawText };
}

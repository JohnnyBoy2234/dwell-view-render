import { parseSaId } from '@mzanzihomes/common/utils/saId';

export interface ExtractedIdInfo {
  full_name?: string;
  id_number?: string;
  date_of_birth?: string;
  nationality?: string;
  document_type?: string;
  expiry_date?: string;
}

/**
 * OCR extraction from an uploaded ID document.
 *
 * INTEGRATION POINT: no OCR/verification provider is connected yet. When one
 * is, implement this against its API and return the extracted fields; the
 * wizard already handles both outcomes (autofill on success, manual entry on
 * null). Never report the document as "verified" from here — verification is
 * a separate provider concern.
 */
export async function extractIdInfo(_file: File): Promise<ExtractedIdInfo | null> {
  return null;
}

/**
 * Derives what we legitimately can without a provider: date of birth from a
 * valid South African ID number.
 */
export function deriveFromIdNumber(idNumber: string): ExtractedIdInfo | null {
  const info = parseSaId(idNumber.trim());
  if (!info) return null;
  return { date_of_birth: info.dateOfBirth, document_type: 'sa_id' };
}

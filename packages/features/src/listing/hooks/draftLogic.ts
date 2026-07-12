import { DESCRIPTION_MIN, MIN_PHOTOS, isValidPostalCode } from '../validation';

// A draft row is a `properties` row with is_listed = false. The resume step
// is the first wizard step whose required data is missing. Bedrooms default
// to 0 in the DB (0 = bachelor is valid), so step 3 keys off bathrooms >= 1.
export function deriveResumeStep(row: Record<string, any>): number {
  if (!row.property_type) return 1;
  if (
    !(row.suburb ?? '').trim() ||
    !(row.city ?? '').trim() ||
    !(row.province ?? '').trim() ||
    !isValidPostalCode(row.postal_code ?? '') ||
    (row.description ?? '').trim().length < DESCRIPTION_MIN
  ) {
    return 2;
  }
  if (!row.bathrooms || Number(row.bathrooms) < 1) return 3;
  if (!row.price || Number(row.price) <= 0) return 4;
  if (!row.images || row.images.length < MIN_PHOTOS) return 5;
  return 6;
}

export function isIncompleteDraft(row: Record<string, any>): boolean {
  return deriveResumeStep(row) < 6;
}

export function nextRetryDelay(attempt: number): number {
  return Math.min(2000 * 2 ** (attempt - 1), 30000);
}

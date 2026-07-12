/**
 * South African 13-digit ID number: YYMMDD SSSS C A Z
 * Extracts date of birth and validates the Luhn check digit — the only
 * "extraction" possible without an OCR/verification provider.
 */

export interface SaIdInfo {
  dateOfBirth: string; // ISO yyyy-mm-dd
  citizen: boolean;
}

export function isValidSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  if (sum % 10 !== 0) return false;
  return parseSaIdDate(id) !== null;
}

function parseSaIdDate(id: string): string | null {
  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  // Pivot: two-digit years above the current year are 19xx
  const currentYY = new Date().getFullYear() % 100;
  const year = yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd || mm < 1) return null;
  return date.toISOString().slice(0, 10);
}

/** Returns extracted info for a valid SA ID number, else null. */
export function parseSaId(id: string): SaIdInfo | null {
  if (!isValidSaId(id)) return null;
  return {
    dateOfBirth: parseSaIdDate(id)!,
    citizen: id[10] === '0'
  };
}

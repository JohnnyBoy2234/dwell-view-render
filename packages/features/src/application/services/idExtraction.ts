import { isValidSaId, parseSaId } from '@mzanzihomes/common/utils/saId';

export interface ExtractedIdInfo {
  first_name?: string;
  last_name?: string;
  id_number?: string;
  date_of_birth?: string;
  nationality?: string;
  document_type?: string;
}

/** Value on the line after a label like "Surname" / "Names" on SA ID cards
 * and books (labels can carry OCR noise, e.g. "Surname/Van"). */
function labelledValue(lines: string[], label: string): string | undefined {
  const idx = lines.findIndex((l) => new RegExp(`^${label}\\b`, 'i').test(l));
  const value = idx >= 0 ? lines[idx + 1]?.trim() : undefined;
  // A real name line: letters only, not the next label
  if (value && /^[A-Za-z][A-Za-z .'-]+$/.test(value) && !/^(surname|names|forenames|identity|nationality|sex|country|date)/i.test(value)) {
    return value;
  }
  return undefined;
}

/**
 * Pulls what we can trust out of OCR text from a South African ID document:
 * the 13-digit ID number (Luhn-validated, spaces tolerated), the date of
 * birth and citizenship derived from it, and — when the card's labels are
 * legible — surname and names. Returns null when nothing usable was found.
 */
export function parseIdText(text: string): ExtractedIdInfo | null {
  if (!text) return null;

  let idNumber: string | undefined;
  // SA IDs are printed with grouping spaces ("800101 5009 087") — scan every
  // 13-digit window of the digit stream per line.
  for (const line of text.split('\n')) {
    const digits = line.replace(/\D/g, '');
    for (let i = 0; i + 13 <= digits.length && !idNumber; i++) {
      const candidate = digits.slice(i, i + 13);
      if (isValidSaId(candidate)) idNumber = candidate;
    }
    if (idNumber) break;
  }
  if (!idNumber) return null;

  const parsed = parseSaId(idNumber)!;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const info: ExtractedIdInfo = {
    id_number: idNumber,
    date_of_birth: parsed.dateOfBirth,
    document_type: 'sa_id'
  };
  if (parsed.citizen) info.nationality = 'South African';

  const surname = labelledValue(lines, 'Surname');
  const names = labelledValue(lines, 'Names') ?? labelledValue(lines, 'Forenames');
  if (surname) info.last_name = surname;
  if (names) info.first_name = names;

  return info;
}

/**
 * OCR extraction from an uploaded ID image, fully client-side (tesseract.js,
 * loaded on demand so it never weighs down the main bundle). Best-effort by
 * contract: any failure — PDF input, unreadable photo, engine unavailable
 * offline — returns null and the wizard falls back to manual entry.
 *
 * This is NOT identity verification; a verification provider remains a
 * separate integration.
 */
export async function extractIdInfo(file: File): Promise<ExtractedIdInfo | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(file);
      return parseIdText(data.text ?? '');
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.warn('ID text extraction unavailable', error);
    return null;
  }
}

/**
 * Derives what we legitimately can as the user types: date of birth from a
 * valid South African ID number.
 */
export function deriveFromIdNumber(idNumber: string): ExtractedIdInfo | null {
  const info = parseSaId(idNumber.trim());
  if (!info) return null;
  return { date_of_birth: info.dateOfBirth, document_type: 'sa_id' };
}

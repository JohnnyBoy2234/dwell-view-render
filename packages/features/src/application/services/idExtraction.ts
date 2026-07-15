import { supabase } from '@mzanzihomes/supabase/client';
import { isValidSaId, parseSaId } from '@mzanzihomes/common/utils/saId';

export interface ExtractedIdInfo {
  first_name?: string;
  last_name?: string;
  id_number?: string;
  date_of_birth?: string;
  id_expiry_date?: string;
  nationality?: string;
  document_type?: string;
}

/** Fields worth flagging on the review screen when we're not confident in them. */
export type ExtractedFieldKey = Exclude<keyof ExtractedIdInfo, 'document_type'>;

// Names come from a fragile label-adjacency regex, not an algorithmic check —
// always ask the applicant to double-check them regardless of OCR confidence.
const ALWAYS_LOW_CONFIDENCE: ExtractedFieldKey[] = ['first_name', 'last_name'];
const LOW_OCR_CONFIDENCE_THRESHOLD = 65;

/** Which extracted fields should be highlighted for review. ID number, date of
 * birth and nationality are algorithmically derived (Luhn/MRZ checksum) so they
 * stay unflagged unless the whole scan's OCR confidence was low. `null` means
 * the OCR provider gave no usable scalar confidence (OCR.space's non-overlay
 * response doesn't) — algorithmic fields are trusted in that case and only
 * the always-fragile fields (names) are flagged. */
export function lowConfidenceFields(extracted: ExtractedIdInfo, ocrConfidence: number | null): ExtractedFieldKey[] {
  const keys = Object.keys(extracted).filter((k) => k !== 'document_type') as ExtractedFieldKey[];
  if (ocrConfidence !== null && ocrConfidence < LOW_OCR_CONFIDENCE_THRESHOLD) return keys;
  return keys.filter((k) => ALWAYS_LOW_CONFIDENCE.includes(k));
}

/** Value after a label like "Surname" / "Names" on SA ID cards and books —
 * either on the same line ("Surname: NKOSI") or the line below (smart card
 * layouts print the label and value as separate lines). Labels can carry
 * OCR noise, e.g. "Surname/Van". */
function labelledValue(lines: string[], label: string): string | undefined {
  const labelRe = new RegExp(`^${label}\\b[:./]?\\s*(.*)$`, 'i');
  const idx = lines.findIndex((l) => labelRe.test(l));
  if (idx < 0) return undefined;

  const sameLine = lines[idx].match(labelRe)?.[1]?.trim();
  const value = sameLine || lines[idx + 1]?.trim();
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

// Passport MRZ (ICAO 9303 TD3): two 44-character lines. Character value for
// the weighted check digit: '<' is 0, digits are their value, letters are
// A=10..Z=35. Weights cycle 7,3,1 across the field being checked.
const MRZ_WEIGHTS = [7, 3, 1];

function mrzCharValue(c: string): number {
  if (c === '<') return 0;
  if (c >= '0' && c <= '9') return Number(c);
  return c.charCodeAt(0) - 55;
}

function mrzCheckDigit(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += mrzCharValue(field[i]) * MRZ_WEIGHTS[i % 3];
  return sum % 10;
}

// Same "no century assumption without context" approach as the SA ID parser:
// pivot on the current two-digit year. Good enough for a value the applicant
// must still confirm; never treated as proof on its own.
function mrzDate(yyMMdd: string): string | null {
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = Number(yyMMdd.slice(2, 4));
  const dd = Number(yyMMdd.slice(4, 6));
  const currentYY = new Date().getFullYear() % 100;
  const year = yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(Date.UTC(year, mm - 1, dd));
  if (date.getUTCMonth() !== mm - 1 || date.getUTCDate() !== dd || mm < 1) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Pulls what we can trust out of OCR text for a passport's machine-readable
 * zone: passport number, date of birth and expiry (each check-digit
 * validated), and names when the visual-zone line is intact. A check-digit
 * mismatch means the line was misread — we reject it rather than guess at a
 * repair. Returns null when no valid MRZ pair is found.
 */
export function parseMrzText(text: string): ExtractedIdInfo | null {
  if (!text) return null;
  const lines = text
    .split('\n')
    .map((l) => l.trim().toUpperCase().replace(/\s/g, ''))
    .filter((l) => l.length === 44 && /^[A-Z0-9<]+$/.test(l));

  for (let i = 0; i + 1 < lines.length; i++) {
    const [line1, line2] = [lines[i], lines[i + 1]];
    if (line1[0] !== 'P') continue;

    const passportNumberField = line2.slice(0, 9);
    if (mrzCheckDigit(passportNumberField) !== Number(line2[9])) continue;

    const dobField = line2.slice(13, 19);
    if (mrzCheckDigit(dobField) !== Number(line2[19])) continue;
    const dateOfBirth = mrzDate(dobField);
    if (!dateOfBirth) continue;

    const expiryField = line2.slice(21, 27);
    if (mrzCheckDigit(expiryField) !== Number(line2[27])) continue;
    const expiryDate = mrzDate(expiryField);

    const info: ExtractedIdInfo = {
      id_number: passportNumberField.replace(/</g, ''),
      date_of_birth: dateOfBirth,
      document_type: 'passport'
    };
    if (expiryDate) info.id_expiry_date = expiryDate;

    const [surnamePart, givenPart] = line1.slice(5).split('<<');
    const surname = surnamePart?.replace(/</g, ' ').trim();
    const givenNames = givenPart?.replace(/</g, ' ').trim();
    if (surname) info.last_name = surname;
    if (givenNames) info.first_name = givenNames;

    return info;
  }
  return null;
}

// MRZ first: its structure requires three independent checksums to agree
// (passport number, DOB, expiry) plus a fixed 44-char/leading-'P' shape — far
// stronger than a bare 13-digit Luhn match. Checking SA ID first was found,
// by testing against a real OCR read of a passport, to occasionally grab a
// coincidentally Luhn-valid digit run out of the MRZ line's noise and mask
// the correct parse entirely.
function parseDocumentText(text: string): ExtractedIdInfo | null {
  return parseMrzText(text) ?? parseIdText(text);
}

export interface OcrScanResult {
  info: ExtractedIdInfo;
  lowConfidence: ExtractedFieldKey[];
}

/**
 * OCR extraction from an uploaded ID image. The image never leaves our own
 * backend for a third party directly from the browser: this posts to the
 * ocr-process Edge Function, which proxies to OCR.space server-side and
 * keeps the provider API key private. Best-effort by contract: any failure —
 * PDF input, unreadable photo, provider unavailable, network error — returns
 * null and the wizard falls back to manual entry.
 *
 * This is NOT identity verification; a verification provider remains a
 * separate integration.
 */
export async function extractIdInfo(file: File | Blob): Promise<OcrScanResult | null> {
  if (!file.type.startsWith('image/')) return null;
  try {
    const body = new FormData();
    body.append('file', file, file instanceof File ? file.name : 'id-scan.jpg');
    body.append('documentType', 'sa_id');
    body.append('language', 'eng');
    body.append('overlay', 'false');

    const { data, error } = await supabase.functions.invoke('ocr-process', { body });
    if (error || !data?.success) return null;

    const info = parseDocumentText(data.rawText ?? '');
    if (!info) return null;
    // OCR.space's non-overlay response carries no scalar confidence — see
    // lowConfidenceFields for how a null confidence is handled.
    return { info, lowConfidence: lowConfidenceFields(info, null) };
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

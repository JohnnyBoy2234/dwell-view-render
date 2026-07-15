import { DOCUMENT_TYPES, type OcrErrorCode, type RentalDocumentType } from './types.ts';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

// Narrow on purpose: OCR.space supports many more, but this repo only needs
// English today. Extend when a real multi-language requirement shows up.
const ALLOWED_LANGUAGES = ['eng'];

export type ValidationError = { code: OcrErrorCode; message: string };

export function validateFile(file: File | null, maxFileSizeMb: number): ValidationError | null {
  if (!file) return { code: 'FILE_REQUIRED', message: 'A file is required.' };
  if (file.size === 0) return { code: 'INVALID_UPLOAD', message: 'The uploaded file is empty.' };
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { code: 'UNSUPPORTED_FILE_TYPE', message: `Unsupported file type: ${file.type || 'unknown'}.` };
  }
  const maxBytes = maxFileSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { code: 'FILE_TOO_LARGE', message: `File exceeds the ${maxFileSizeMb}MB limit.` };
  }
  return null;
}

/** Confirms the file's magic bytes match its declared MIME type — a renamed
 * .exe with a .jpg extension and a spoofed content-type won't pass this. */
export async function checkMagicBytes(file: File): Promise<ValidationError | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47;
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  const isWebp =
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;

  const matchesDeclaredType: Record<string, boolean> = {
    'image/jpeg': isJpeg,
    'image/png': isPng,
    'application/pdf': isPdf,
    'image/webp': isWebp
  };

  if (matchesDeclaredType[file.type] === false) {
    return { code: 'INVALID_UPLOAD', message: 'The file contents do not match its declared type.' };
  }
  return null;
}

export function isValidDocumentType(value: string): value is RentalDocumentType {
  return (DOCUMENT_TYPES as string[]).includes(value);
}

export function isValidLanguage(value: string): boolean {
  return ALLOWED_LANGUAGES.includes(value);
}

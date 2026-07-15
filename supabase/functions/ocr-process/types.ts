// Provider-independent OCR contract. Nothing in here (or in anything that
// imports only this file) may name OCR.space — that isolation is what lets a
// future provider replace it without touching the frontend or the
// post-processing extractors.

export type RentalDocumentType = 'sa_id' | 'payslip' | 'bank_statement' | 'rental_application' | 'other';

export const DOCUMENT_TYPES: RentalDocumentType[] = ['sa_id', 'payslip', 'bank_statement', 'rental_application', 'other'];

export type NormalizedOcrPage = {
  pageNumber: number;
  text: string;
  // Word/line-level overlay boxes aren't included: no current consumer reads
  // them (field parsing works off page text), and OCR.space's free-tier
  // overlay confidence is sparse. Add if region-based extraction needs it.
  confidence: number | null;
};

export type NormalizedOcrResult = {
  provider: 'ocr.space';
  success: true;
  rawText: string;
  pages: NormalizedOcrPage[];
  documentType: RentalDocumentType;
  meta: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    processingMs: number;
    language: string;
    overlayRequested: boolean;
    requestId: string;
  };
  fields?: Record<string, unknown>;
  warnings?: string[];
  raw?: unknown;
};

export type OcrErrorCode =
  | 'FILE_REQUIRED'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_UPLOAD'
  | 'OCR_NOT_CONFIGURED'
  | 'OCR_TIMEOUT'
  | 'OCR_PROVIDER_AUTH_ERROR'
  | 'OCR_PROVIDER_ERROR'
  | 'OCR_MALFORMED_RESPONSE'
  | 'OCR_EMPTY_RESULT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED';

export type NormalizedOcrError = {
  success: false;
  error: {
    code: OcrErrorCode;
    message: string;
    requestId: string;
  };
};

// OCR_EMPTY_RESULT is 200: the provider succeeded, there's just nothing
// readable in the document — a normal outcome the frontend shows as its own
// "empty result" state, not as a provider failure.
export const ERROR_STATUS: Record<OcrErrorCode, number> = {
  FILE_REQUIRED: 400,
  UNSUPPORTED_FILE_TYPE: 400,
  FILE_TOO_LARGE: 400,
  INVALID_UPLOAD: 400,
  UNAUTHORIZED: 401,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  OCR_NOT_CONFIGURED: 503,
  OCR_PROVIDER_AUTH_ERROR: 502,
  OCR_PROVIDER_ERROR: 502,
  OCR_MALFORMED_RESPONSE: 502,
  OCR_TIMEOUT: 504,
  OCR_EMPTY_RESULT: 200
};

import type { NormalizedOcrPage, NormalizedOcrResult, OcrErrorCode, RentalDocumentType } from './types.ts';

// This file is the ONLY place that knows OCR.space's field names
// (ParsedResults, IsErroredOnProcessing, etc). Swapping providers later means
// writing a new file like this one and pointing ocrService-equivalent code at
// it — nothing else in this function should import OCR.space specifics.
//
// TODO(provider-fallback): if OCR.space has an outage, add a second provider
// adapter and a simple pick-one-that-works wrapper. Not built now — no
// second provider is configured, so it would be dead code.

export type OcrSpaceOptions = {
  language: string;
  isOverlayRequired: boolean;
  detectOrientation?: boolean;
  scale?: boolean;
  isTable?: boolean;
  OCREngine?: 1 | 2 | 3;
};

export interface OcrProviderInput {
  buffer: ArrayBuffer;
  fileName: string;
  mimeType: string;
  documentType: RentalDocumentType;
  options: OcrSpaceOptions;
}

export interface OcrProviderConfig {
  apiKey: string;
  apiUrl: string;
  timeoutMs: number;
  includeRawResponse: boolean;
}

export type OcrProviderOutcome =
  | { result: NormalizedOcrResult; errorCode?: undefined; errorMessage?: undefined }
  | { result?: undefined; errorCode: OcrErrorCode; errorMessage: string };

const AUTH_ERROR_PATTERN = /invalid api key|not a valid api key|unauthorized/i;

export async function processWithOcrSpace(
  input: OcrProviderInput,
  config: OcrProviderConfig,
  requestId: string
): Promise<OcrProviderOutcome> {
  const form = new FormData();
  form.append('apikey', config.apiKey);
  form.append('language', input.options.language);
  form.append('isOverlayRequired', String(input.options.isOverlayRequired));
  if (input.options.detectOrientation !== undefined) form.append('detectOrientation', String(input.options.detectOrientation));
  if (input.options.scale !== undefined) form.append('scale', String(input.options.scale));
  if (input.options.isTable !== undefined) form.append('isTable', String(input.options.isTable));
  if (input.options.OCREngine !== undefined) form.append('OCREngine', String(input.options.OCREngine));
  form.append('file', new Blob([input.buffer], { type: input.mimeType }), input.fileName);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();

  let response: Response;
  try {
    response = await fetch(config.apiUrl, { method: 'POST', body: form, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { errorCode: 'OCR_TIMEOUT', errorMessage: 'The OCR request timed out.' };
    }
    return { errorCode: 'OCR_PROVIDER_ERROR', errorMessage: 'Could not reach the OCR provider.' };
  } finally {
    clearTimeout(timeout);
  }

  const processingMs = Date.now() - startedAt;

  if (response.status === 401 || response.status === 403) {
    return { errorCode: 'OCR_PROVIDER_AUTH_ERROR', errorMessage: 'The OCR provider rejected the request credentials.' };
  }
  if (response.status === 429) {
    return { errorCode: 'OCR_PROVIDER_ERROR', errorMessage: 'The OCR provider is rate-limiting requests.' };
  }
  if (!response.ok) {
    return { errorCode: 'OCR_PROVIDER_ERROR', errorMessage: `The OCR provider returned HTTP ${response.status}.` };
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    return { errorCode: 'OCR_MALFORMED_RESPONSE', errorMessage: 'The OCR provider returned an unreadable response.' };
  }

  if (body?.IsErroredOnProcessing) {
    const message = Array.isArray(body.ErrorMessage)
      ? body.ErrorMessage.join('; ')
      : body.ErrorMessage || body.ErrorDetails || 'The OCR provider failed to process this document.';
    if (AUTH_ERROR_PATTERN.test(String(message))) {
      return { errorCode: 'OCR_PROVIDER_AUTH_ERROR', errorMessage: 'The OCR provider rejected the request credentials.' };
    }
    return { errorCode: 'OCR_PROVIDER_ERROR', errorMessage: String(message) };
  }

  const parsedResults = Array.isArray(body?.ParsedResults) ? body.ParsedResults : [];
  if (parsedResults.length === 0) {
    return { errorCode: 'OCR_MALFORMED_RESPONSE', errorMessage: 'The OCR provider returned no parsed pages.' };
  }

  const pages: NormalizedOcrPage[] = parsedResults.map((page: any, index: number) => ({
    pageNumber: index + 1,
    text: typeof page?.ParsedText === 'string' ? page.ParsedText : '',
    confidence: null
  }));

  const rawText = pages.map((page) => page.text.trim()).filter(Boolean).join('\n\n');

  if (!rawText) {
    return { errorCode: 'OCR_EMPTY_RESULT', errorMessage: 'No readable text was found in this document.' };
  }

  const result: NormalizedOcrResult = {
    provider: 'ocr.space',
    success: true,
    rawText,
    pages,
    documentType: input.documentType,
    meta: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.buffer.byteLength,
      processingMs,
      language: input.options.language,
      overlayRequested: input.options.isOverlayRequired,
      requestId
    },
    ...(config.includeRawResponse ? { raw: body } : {})
  };

  return { result };
}

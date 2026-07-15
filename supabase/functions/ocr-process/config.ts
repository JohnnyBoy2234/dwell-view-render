export interface OcrConfig {
  apiKey: string | undefined;
  apiUrl: string;
  timeoutMs: number;
  maxFileSizeMb: number;
  includeRawResponse: boolean;
  defaultLanguage: string;
  defaultOverlay: boolean;
}

export function loadOcrConfig(): OcrConfig {
  return {
    apiKey: Deno.env.get('OCR_SPACE_API_KEY'),
    apiUrl: Deno.env.get('OCR_SPACE_API_URL') ?? 'https://api.ocr.space/parse/image',
    timeoutMs: Number(Deno.env.get('OCR_SPACE_TIMEOUT_MS') ?? 45000),
    maxFileSizeMb: Number(Deno.env.get('OCR_MAX_FILE_SIZE_MB') ?? 10),
    includeRawResponse: Deno.env.get('OCR_INCLUDE_RAW_RESPONSE') === 'true',
    defaultLanguage: Deno.env.get('OCR_DEFAULT_LANGUAGE') ?? 'eng',
    defaultOverlay: Deno.env.get('OCR_DEFAULT_OVERLAY') === 'true'
  };
}

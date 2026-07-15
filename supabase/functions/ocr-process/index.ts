import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { loadOcrConfig } from "./config.ts";
import { processWithOcrSpace } from "./ocrSpaceProvider.ts";
import { runPostProcessing } from "./postProcessing/index.ts";
import { ERROR_STATUS, type NormalizedOcrError, type OcrErrorCode, type RentalDocumentType } from "./types.ts";
import { checkMagicBytes, isValidDocumentType, isValidLanguage, validateFile } from "./validate.ts";

// Identity documents, payslips, bank statements and rental-application PDFs
// carry sensitive personal information. OCR.space is a third-party processor
// for this workflow — MzansiHomes' Privacy Policy and POPIA operator
// obligations must disclose that processing. Per OCR.space's own stated
// (not contractually guaranteed — reverify periodically) practices:
// uploaded documents are deleted after processing, searchable-PDF output
// (not requested here) may persist up to 60 minutes, and API-access IP
// addresses are logged for roughly a month. This function does not store
// uploaded documents itself and does not request searchable PDFs.
//
// This endpoint performs text extraction only. It is not identity
// verification, and nothing here should be presented to an applicant or
// landlord as verified.

function errorResponse(code: OcrErrorCode, message: string, requestId: string): Response {
  const body: NormalizedOcrError = { success: false, error: { code, message, requestId } };
  return new Response(JSON.stringify(body), {
    status: ERROR_STATUS[code],
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (req.method !== 'POST') {
      return errorResponse('INVALID_UPLOAD', 'Only POST is supported.', requestId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { data: userData } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    const user = userData?.user;
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Sign in required.', requestId);
    }

    const config = loadOcrConfig();
    if (!config.apiKey) {
      console.error(JSON.stringify({ requestId, event: 'ocr_not_configured' }));
      return errorResponse('OCR_NOT_CONFIGURED', 'Document reading is not available right now.', requestId);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return errorResponse('INVALID_UPLOAD', 'Could not read the upload.', requestId);
    }

    if (formData.getAll('file').length > 1) {
      return errorResponse('INVALID_UPLOAD', 'Only one file may be uploaded per request.', requestId);
    }
    const file = formData.get('file');
    const fileValidationError = validateFile(file instanceof File ? file : null, config.maxFileSizeMb);
    if (fileValidationError) {
      return errorResponse(fileValidationError.code, fileValidationError.message, requestId);
    }
    const uploadedFile = file as File;

    const magicByteError = await checkMagicBytes(uploadedFile);
    if (magicByteError) {
      return errorResponse(magicByteError.code, magicByteError.message, requestId);
    }

    const documentTypeRaw = formData.get('documentType');
    if (documentTypeRaw !== null && !isValidDocumentType(String(documentTypeRaw))) {
      return errorResponse('INVALID_UPLOAD', 'Unsupported documentType.', requestId);
    }
    const documentType = (documentTypeRaw ? String(documentTypeRaw) : 'other') as RentalDocumentType;

    const languageRaw = formData.get('language');
    if (languageRaw !== null && !isValidLanguage(String(languageRaw))) {
      return errorResponse('INVALID_UPLOAD', 'Unsupported language.', requestId);
    }
    const language = languageRaw ? String(languageRaw) : config.defaultLanguage;

    const overlayRaw = formData.get('overlay');
    const overlay = overlayRaw !== null ? String(overlayRaw) === 'true' : config.defaultOverlay;

    // In memory only — never written to disk, released once this request
    // returns. The OCR-proxy flow does not persist uploaded documents.
    const buffer = await uploadedFile.arrayBuffer();

    const outcome = await processWithOcrSpace(
      {
        buffer,
        fileName: uploadedFile.name,
        mimeType: uploadedFile.type,
        documentType,
        options: { language, isOverlayRequired: overlay }
      },
      { apiKey: config.apiKey, apiUrl: config.apiUrl, timeoutMs: config.timeoutMs, includeRawResponse: config.includeRawResponse },
      requestId
    );

    const processingMs = Date.now() - startedAt;
    const safeLog = {
      requestId,
      userId: user.id,
      documentType,
      mimeType: uploadedFile.type,
      fileSize: uploadedFile.size,
      provider: 'ocr.space',
      processingMs
    };

    if (outcome.errorCode) {
      console.log(JSON.stringify({ ...safeLog, status: 'error', errorCode: outcome.errorCode }));
      return errorResponse(outcome.errorCode, outcome.errorMessage, requestId);
    }

    const fields = await runPostProcessing(documentType, outcome.result);
    const finalResult = { ...outcome.result, fields };

    console.log(JSON.stringify({ ...safeLog, status: 'success', pageCount: outcome.result.pages.length }));

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(JSON.stringify({ requestId, event: 'unhandled_error', message: (error as Error).message }));
    return errorResponse('INTERNAL_ERROR', 'Something went wrong while reading this document.', requestId);
  }
});

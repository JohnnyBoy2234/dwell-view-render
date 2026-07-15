# OCR.space integration

## Overview

Rental-application document text extraction (SA ID, payslip, bank statement,
rental-application PDF) is proxied through [OCR.space](https://ocr.space)
behind a MzansiHomes-owned Supabase Edge Function,
[`supabase/functions/ocr-process`](../supabase/functions/ocr-process).

- The frontend never talks to OCR.space directly and never sees its API key.
- The frontend contract is provider-independent: it uploads a document and
  gets back normalized text. If OCR.space is replaced later, only
  `ocr-process/ocrSpaceProvider.ts` changes — nothing in `apps/*` or
  `packages/features` needs to know.
- **This is text extraction, not identity verification.** It does not confirm
  a document is genuine, unedited, or belongs to the uploader. Every
  extracted value is a candidate the applicant must review and confirm
  before it becomes part of the application (see `YourDetailsStep.tsx`).

## Environment setup

Edge Function secrets, not frontend `VITE_` vars — set via `supabase secrets
set` (remote) or `supabase/functions/.env` (gitignored, for local
`supabase functions serve`). See `.env.example` for the full list:

```
OCR_SPACE_API_KEY=          # required — get one at https://ocr.space/ocrapi
OCR_SPACE_API_URL=https://api.ocr.space/parse/image
OCR_SPACE_TIMEOUT_MS=45000
OCR_MAX_FILE_SIZE_MB=10
OCR_INCLUDE_RAW_RESPONSE=false   # dev-only; never true in production
OCR_DEFAULT_LANGUAGE=eng
OCR_DEFAULT_OVERLAY=false
```

## Local development

```bash
npm install
cp .env.example supabase/functions/.env   # then fill in OCR_SPACE_API_KEY
npm run supabase -- start
npm run supabase -- functions serve ocr-process --env-file supabase/functions/.env
```

Run the tests (pure Deno, no framework):

```bash
deno test supabase/functions/ocr-process/
```

## Example request

```bash
curl -X POST \
  http://127.0.0.1:54321/functions/v1/ocr-process \
  -H "Authorization: Bearer <user-jwt>" \
  -F "file=@./sample-id.jpg" \
  -F "documentType=sa_id" \
  -F "language=eng" \
  -F "overlay=false"
```

## Expected success response

```json
{
  "provider": "ocr.space",
  "success": true,
  "rawText": "REPUBLIC OF SOUTH AFRICA\nIDENTITY NUMBER\n...",
  "pages": [{ "pageNumber": 1, "text": "...", "confidence": null }],
  "documentType": "sa_id",
  "meta": {
    "fileName": "sample-id.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 214532,
    "processingMs": 1180,
    "language": "eng",
    "overlayRequested": false,
    "requestId": "b6e2..."
  },
  "fields": { "text": "REPUBLIC OF SOUTH AFRICA\n..." }
}
```

`fields` is currently text-only — see `postProcessing/` for the per-document
extractors and their TODOs. `raw` (the untouched OCR.space payload) is
included only when `OCR_INCLUDE_RAW_RESPONSE=true`, and that flag must never
be `true` in production.

## Expected error response

```json
{
  "success": false,
  "error": {
    "code": "OCR_PROVIDER_ERROR",
    "message": "The OCR provider is temporarily unavailable.",
    "requestId": "b6e2..."
  }
}
```

| Code | HTTP | Meaning |
|---|---|---|
| `FILE_REQUIRED`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `INVALID_UPLOAD` | 400 | Bad request |
| `UNAUTHORIZED` | 401 | No/invalid session |
| `RATE_LIMITED` | 429 | Reserved — no rate limiter wired up yet, see Known limitations |
| `OCR_NOT_CONFIGURED` | 503 | Missing `OCR_SPACE_API_KEY` |
| `OCR_PROVIDER_AUTH_ERROR`, `OCR_PROVIDER_ERROR`, `OCR_MALFORMED_RESPONSE` | 502 | Upstream provider problem |
| `OCR_TIMEOUT` | 504 | Upstream took longer than `OCR_SPACE_TIMEOUT_MS` |
| `OCR_EMPTY_RESULT` | 200 | Provider succeeded, no readable text — a normal outcome, not a failure |
| `INTERNAL_ERROR` | 500 | Unexpected |

## Supported files

- Images: `image/jpeg`, `image/png`, `image/webp`
- Documents: `application/pdf`
- Size limit: `OCR_MAX_FILE_SIZE_MB` (default 10MB), enforced before the file
  is sent upstream. Content is also checked against its declared MIME type
  via magic bytes (`validate.ts`), not just the extension.

## Privacy

- Files are handled in memory only inside `ocr-process` and never written to
  disk or a bucket by this function. The buffer is released once the request
  returns.
- If the rental-application flow separately stores the original document
  (it does — `documentService.ts` → private Supabase Storage bucket), that
  storage is unrelated to this proxy and keeps its own access controls;
  `ocr-process` is not the system of record.
- OCR.space is a third-party processor of identity documents, payslips, bank
  statements and rental-application PDFs. MzansiHomes' Privacy Policy and
  POPIA operator disclosures must cover this processing.
- Per OCR.space's own **stated practices** (not a contractual guarantee —
  reverify against https://ocr.space during compliance review): uploaded
  documents are deleted after processing; searchable-PDF output (not
  requested by this integration) may remain downloadable for up to 60
  minutes; API-access IP addresses are logged for roughly a month.
- Safe logging only: request ID, user ID, document type, MIME type, file
  size, page count, processing time, provider name/status, error code. Never
  logged: raw OCR text, names, ID/passport/account numbers, salary figures,
  addresses, the raw provider response, or the uploaded bytes.

## Known limitations

- Poor lighting, blur and glare reduce OCR quality (client-side capture
  guidance/quality gate lives in `packages/features/.../imageQuality.ts` and
  `imagePipeline.ts`, upstream of this endpoint).
- Handwriting is not reliably read.
- Complex tables (e.g. bank-statement transaction lists) do not preserve
  structure — text comes back linearized.
- Low-resolution scans may return incomplete text.
- Multi-page PDFs take longer than a single image.
- OCR text can contain mistakes; applicant review is always required and
  nothing is auto-saved.
- No endpoint-level rate limiting is wired up yet (see TODOs in
  `ocr-process/index.ts`) — the platform's per-user JWT auth is the only
  current throttle.
- `postProcessing/*Extractor.ts` return text only; structured field
  extraction is a follow-up (see the TODO comment in each file).
- Only the ID-scan step (`YourDetailsStep.tsx`) is wired to this endpoint.
  Payslip/bank-statement/rental-application-PDF uploads don't have an OCR UI
  yet — the backend already accepts those `documentType` values for when
  that UI is built.

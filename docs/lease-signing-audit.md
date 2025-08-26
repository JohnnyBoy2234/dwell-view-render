# Lease Signing Workflow Audit

This document outlines the key touchpoints of the existing lease signing workflow in the application. The audit was conducted to prepare for the integration of DocuSign as a new e-signature provider.

## 1. Current Provider: "Legacy PDF Signing"

The existing system is an in-house solution for generating and signing lease agreements. It does not use an external e-signature provider.

- **Document Generation**: A Supabase Edge Function (`generate-lease`) creates a PDF from scratch using the `pdf-lib` library.
- **Storage**: Generated PDFs and captured signature images are stored in a Supabase Storage bucket named `lease-documents`.
- **Signing UI**: A custom React component (`src/components/lease/LeaseSigningDialog.tsx`) captures user signatures as images on a canvas and uploads them.
- **State Management**: The frontend updates the `tenancies` table after signature capture, advancing `lease_status`.

## 2. Backend Touchpoints

- **`supabase/functions/generate-lease/index.ts`**
  - Creates a PDF lease, uploads it to storage, and updates `tenancies.lease_document_path` and `tenancies.lease_status` to `awaiting_tenant_signature`.

- **`supabase/functions/notify-lease-signed/index.ts`**
  - Logs a notification message post-signing; placeholder for email sending via Resend.

- **`supabase/functions/landlord-get-document-url/index.ts`**
  - Generates short-lived signed URLs to tenant-uploaded documents for landlord viewing.

## 3. Webhooks

- No external webhooks for signing. Status transitions occur directly from frontend updates.

## 4. Database Models & Columns

Primary table: `public.tenancies`

- `lease_document_path` (text): Path in `lease-documents` bucket.
- `lease_status` (text): Workflow state.
- `landlord_signature_url` / `tenant_signature_url` (text): Signature image paths.
- `landlord_signed_at` / `tenant_signed_at` (timestamp): Signature times.

Indexes and RLS policies exist for performance and access.

## 5. Legacy Status Values

From migrations (e.g., `20250812195236-.sql` and related):

- `draft`
- `awaiting_tenant_signature`
- `awaiting_landlord_signature`
- `completed`
- `cancelled`
- `expired`

## 6. Frontend Components

- `src/components/lease/LeaseGenerator.tsx`
  - Triggers `generate-lease`, shows status badges, opens document viewer, downloads PDF.

- `src/components/lease/LeaseSigningDialog.tsx`
  - Handles document viewing and signature capture, uploads signature to storage, updates tenancy status.

- `src/components/lease/SignatureCapture.tsx`
  - Canvas-based signature capture component.

- Additional views (readers): `SignedLeasesList.tsx`, `TemplateLeaseWorkflow.tsx`, `UploadLeaseWorkflow.tsx`.

## 7. Inferred Legacy Provider

- Referred to as "legacy" in this audit.
- Status mapping for normalization (proposed):
  - `draft` → draft
  - `awaiting_tenant_signature` → sent
  - `awaiting_landlord_signature` → delivered
  - `completed` → completed
  - `cancelled` → voided
  - `expired` → expired

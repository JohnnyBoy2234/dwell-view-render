# Affordability assessment (self-hosted bank-statement analysis)

Decision-support feature for rental applications. A tenant consents and uploads
bank-statement PDFs; our own backend extracts and validates the financial data,
computes affordability metrics, and presents an **explainable** assessment to the
landlord.

**This is decision-support only.** The system never auto-approves or auto-rejects
a tenant. It does not claim 100% accuracy. The landlord makes the final decision
after reviewing the assessment. Approve/Decline remain separate from this feature.

## ⚠️ Legal / POPIA — read before production

This feature is **not** production-ready or "legally compliant" on the basis of
this implementation alone. Before any production release, a **South African
privacy (POPIA) professional** must review:

- the tenant consent wording and versioning,
- the data-retention period and deletion process (incl. backups),
- the automated-decision / profiling handling,
- the rental-screening rules and reason codes.

Do not describe the feature as compliant until that review is complete.

## Architecture decision

The app backend is **Supabase only** (Postgres + Deno Edge Functions + Storage +
Auth). The OCR tools named in the spec (Tesseract, OpenCV, OCRmyPDF, Camelot,
PyMuPDF) are Python binaries that **cannot run inside Deno Edge Functions**.

Chosen approach (self-hosted, no external bank-analysis API):

- **Digital (text-layer) PDFs** — the statement most tenants download from their
  banking app — are parsed **in-stack** using a JS/WASM PDF text extractor inside
  an edge function. No new infrastructure.
- **Scanned/photographed statements** requiring OCR are handled by a **pluggable
  `StatementProcessor` extension point**. A self-hosted Python OCR worker
  (FastAPI + queue + Tesseract/OpenCV/OCRmyPDF) can be added later behind that
  interface without reworking the rest of the feature. Until then, scanned
  statements are surfaced as "unable to verify — request a digital statement or
  manual review", never silently guessed.

No external bank-statement analysis provider is used (no AffyAssess, Gathr,
Sorae, Plaid, Ocrolus, etc.).

## Data model (Stage 1 — applied)

Migration `supabase/migrations/20260813000000_affordability_stage1_schema.sql`
creates, all with RLS:

`affordability_settings` (config), `affordability_assessments`,
`affordability_consents`, `affordability_documents`, `affordability_pages`,
`affordability_transactions`, `affordability_income_sources`,
`affordability_expense_categories`, `affordability_warnings`,
`affordability_reason_codes`, `affordability_reviews`,
`affordability_correction_requests`, `affordability_audit_events`,
`affordability_processing_jobs`.

Access isolation (RLS):

- **Tenant** — reads their own assessment + child rows.
- **Landlord** — reads assessments for applications on their properties.
- **Admin** — reads all (`is_admin`).
- **Internal reviews + audit trail** — landlord/admin only (never the tenant).
- **All writes** go through service-role edge functions / the worker (no client
  write policies). Uploaded files live in the **private** `affordability-statements`
  bucket; access only via short-lived signed URLs issued server-side.

### Configuration (not hardcoded)

`affordability_settings` holds the active consent version + text, retention days,
rule version, the affordability rule bands (used only for reason codes — **not** a
universal auto-approve threshold), and upload limits. Change these without a
redeploy.

## Language rules

Use "Affordability assessment". Never use "guaranteed approval / income",
"100% verified", "safe/bad tenant", or "automatic approval/rejection". Warnings
are neutral ("potential document inconsistency — manual review recommended") and
never a fraud accusation.

## Limitations & unsupported formats (current)

- OCR for scanned statements is **not yet implemented** (pluggable worker pending).
- Only one bank parser is implemented first (built against synthetic fixtures);
  other banks (FNB, Capitec, ABSA, Standard Bank, Nedbank) are extension points.
- Unsupported formats show: "This statement format is not currently supported.
  Please upload a statement from a supported bank or request manual review."
- Affordability output is an **assessment aid**, not a verified fact or a decision.

## Environment variables

Edge functions receive `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
automatically. In addition:

- **`AFFORDABILITY_CRON_SECRET`** (required for retention) — shared secret the
  scheduler must send as the `x-cron-secret` header when calling
  `affordability-retention`. Set with:
  `supabase secrets set AFFORDABILITY_CRON_SECRET=<random-value>`
- Optional AI gateway key — only if the (not-yet-built) plain-language layer is
  enabled. AI is used only to explain results/categorise ambiguous descriptions,
  never to invent or override financial values.

No online-banking credentials are ever collected or stored.

## Deploy

1. Migrations (already applied to the linked project; re-run elsewhere with
   `supabase db push`): `20260813000000_affordability_stage1_schema.sql`,
   `20260813010000_affordability_retention_cron.sql`.
2. Deploy the edge functions:
   ```
   supabase functions deploy affordability-consent
   supabase functions deploy affordability-upload
   supabase functions deploy affordability-documents
   supabase functions deploy affordability-process     # bundles _shared/affordability/*
   supabase functions deploy affordability-review
   supabase functions deploy affordability-correction
   supabase functions deploy affordability-retention
   ```
3. Set `AFFORDABILITY_CRON_SECRET` and schedule a daily call to
   `affordability-retention` (dashboard scheduled function or external cron)
   with the `x-cron-secret` header.
4. Rebuild/redeploy the web apps so the wired UI ships.

## Local setup

- `npm install` at the repo root.
- Engine/parser tests: `cd packages/features && npx vitest run src/affordability/engine.test.ts`.
- Local Supabase + functions: `supabase start`, then `supabase functions serve`.

## Sample mock assessment (from the Capitec fixture)

Computed by the engine from `_shared/affordability/fixtures/capitec-employed.txt`
(proposed rent R6,000) — calculated, not hardcoded:

- Verified recurring income: **R18,500/mo** · coverage **3 months**
- Essential expenses: **R10,600/mo** · recurring commitments: **R899/mo**
- Estimated disposable income: **R7,001/mo**
- Rent-to-income: **32%** · balances **reconcile** · confidence **High**

## Limitations & unsupported formats

- **OCR for scanned statements is not implemented** — image-only pages are flagged
  and routed to manual review (pluggable OCR worker is a future stage).
- **One parser (Capitec) implemented**, validated against a synthetic fixture — a
  real redacted sample should tune it before production. FNB / ABSA / Standard
  Bank / Nedbank are registered extension points but not yet implemented →
  "This statement format is not currently supported…".
- **Virus scanning is a hook** (files are type/size validated at upload but not yet
  AV-scanned; real ClamAV belongs with the OCR worker).
- Multi-document statements are parsed as one page stream (balance continuity
  assumes a single statement); source page numbers are global across documents.
- **Not production-ready**: must be tested against real, properly-consented
  statements, and the consent/retention/automated-decision/screening rules need
  SA POPIA legal review (see top of this file).

## Stage roadmap (all implemented)

1. ✅ Schema, RLS, config, private bucket, audit helper.
2. ✅ Consent flow (config-versioned) + tenant consent screen.
3. ✅ Secure upload (real MIME check, size, private storage, signed URLs) + document list.
4. ✅ Processing job model + status state machine + polling + digital-PDF extraction.
5. ✅ Parser architecture + Capitec parser + normalise/categorise/reconcile + deterministic calc engine.
6. ✅ Landlord report UI (overview, breakdown, sources, transactions, warnings, review controls).
7. ✅ Wired into the application review page (tenant flow + landlord report) + correction/human-review.
8. ✅ Tests + fixtures + retention (cron + purge function) + docs.
9. ⏳ Optional: OCR worker, more bank parsers, AI plain-language layer.

## Changed / added files

**Migrations**
- `supabase/migrations/20260813000000_affordability_stage1_schema.sql` — all 13 `affordability_*` tables + config, RLS isolation, audit helper, private bucket.
- `supabase/migrations/20260813010000_affordability_retention_cron.sql` — daily cron to mark expired assessments.

**Edge functions** (`supabase/functions/`)
- `affordability-consent` — records versioned POPIA consent (IP/UA), gates processing.
- `affordability-upload` — real-type/size/count-validated upload to private storage (sha256 dedupe).
- `affordability-documents` — signed-URL preview (audited), delete-before-submit, submit (creates job).
- `affordability-process` — idempotent job runner; runs the pipeline in the background.
- `affordability-review` — landlord/admin note / mark reviewed / override-with-reason / request info.
- `affordability-correction` — tenant/landlord correction + tenant human-review request.
- `affordability-retention` — secret-protected retention purge (files + raw data).
- `_shared/affordability/extract.ts` — digital-PDF text extraction (unpdf).
- `_shared/affordability/banks.ts` — parser registry + bank detection.
- `_shared/affordability/parsers/capitec.ts` — Capitec parser (balance-delta inference).
- `_shared/affordability/analyse.ts` — deterministic categorise/exclude/reconcile/metrics/confidence/reason-codes.
- `_shared/affordability/pipeline.ts` — pipeline orchestrator (state machine, persistence).
- `_shared/affordability/fixtures/capitec-employed.txt` — synthetic reconciling statement.

**Frontend** (`packages/features/src/affordability/`)
- `types.ts`, `service.ts` — shared types + RLS-scoped reads + edge-function calls.
- `components/AffordabilityConsentScreen.tsx` — tenant consent.
- `components/AffordabilityUploadScreen.tsx` — upload + document list.
- `components/AffordabilityProcessingScreen.tsx` — status polling.
- `components/AffordabilityTenantFlow.tsx` — tenant orchestrator + summary + correction/human-review.
- `components/AffordabilityLandlordReport.tsx` — full landlord report + review controls.
- `engine.test.ts` — Vitest tests for the parser + engine.
- `index.ts` — module barrel.

**Wiring**
- `packages/features/src/pages/ApplicationDetail.tsx` — renders the affordability section (landlord report / tenant flow) on the shared review page.

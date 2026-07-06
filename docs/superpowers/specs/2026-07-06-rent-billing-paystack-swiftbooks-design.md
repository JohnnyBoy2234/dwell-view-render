# Rent Billing Cycle, Paystack Test Mode, Rent Collection Onboarding & SwiftBooks Redesign

**Date:** 2026-07-06
**Status:** Approved by user (brainstorming session)

## Overview

Four connected pieces of work:

1. **Paystack test mode** — run the whole payment stack against Paystack test keys so rent collection can be verified end-to-end with test cards before going live.
2. **Monthly billing cycle** — 2 days before month-end, landlords are prompted to complete a bill (rent auto-filled + that month's utility charges); the tenant pays the total through Paystack; both parties get receipts; the platform keeps its own record.
3. **Rent Collection onboarding** — a landlord dashboard tile that creates the landlord's Paystack subaccount, with the existing lease-banking flow as a fallback.
4. **SwiftBooks redesign** — the accounting feature becomes a "Calm ledger": simpler, better-looking, same functionality, and auto-fed by rent payments.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Who pays the bill's expense lines? | **Tenant** — bill = rent + utility charges, one Paystack payment for the total |
| Money routing | **Full amount to the landlord's subaccount** — no platform cut; the platform keeps a record only |
| Landlord misses the billing window? | **Wait for the landlord** — the bill is only ever sent when the landlord submits, even late. No auto-send |
| Tenant banner lifecycle | **Stays red on every page until the bill is paid** — viewing does not dismiss it |
| Expense entry | **Presets + custom** — Water, Sewage, Electricity, Refuse fields plus "Add other charge" (label + amount). **No prefill from prior months** |
| Receipts | **In-app + email + notification** — receipt PDF in both parties' payment pages, emailed to both, plus an in-app "Rent paid" notification for the landlord |
| Billing architecture | **Supabase-native**: pg_cron → `billing-cycle` edge function → new bill tables |
| Banner style | **Red alert bar with white "Pay now" pill** (option B) — bar tap opens bill, pill tap goes straight to payment |
| SwiftBooks direction | **Calm ledger** (option A) — net-income hero + sparkline, income/expense chips, auto-fed ledger, toolbar to existing pages |

## 1. Paystack test mode

- The user has a live Paystack account; its **test keys** are used first, then flipped to live once the flow is verified.
- `PAYSTACK_SECRET_KEY` (Supabase secret) is the single switch — all Paystack edge functions already read it. Set to `sk_test_...` for testing, `sk_live_...` to go live. No code change to switch.
- Client env gains `VITE_PAYSTACK_PUBLIC_KEY` (test `pk_test_...` initially).
- The client learns the active mode from the server (returned by `initialize-paystack-transaction`, or a tiny `get-paystack-mode` endpoint). When in test mode, an amber **TEST MODE** badge shows on the payment sheet and bank-setup screens so test and live can never be confused.
- Verification path: Paystack test cards (e.g. `4084 0840 8408 4081`) exercise checkout + webhooks end to end.

## 2. Data model & schedule

### Tables

**`monthly_bills`**
- `id uuid pk`
- `tenancy_id`, `property_id`, `landlord_id`, `tenant_id`
- `period` (text `YYYY-MM`)
- `rent_amount numeric` (auto-filled from the lease agreement)
- `total_amount numeric` (rent + line items, computed at send time)
- `status`: `awaiting_landlord` → `sent` → `paid`
- `sent_at`, `paid_at` timestamps
- `paystack_reference text`
- `receipt_pdf_path text`
- **Unique `(tenancy_id, period)`** — a month can never be billed twice.

**`bill_line_items`**
- `id uuid pk`, `bill_id fk`
- `category`: `water | sewage | electricity | refuse | other`
- `label text` (display label; required for `other`)
- `amount numeric`

### RLS

- Landlord: full read on own bills; can update line items and send while `awaiting_landlord`.
- Tenant: read-only, and **only** bills with status `sent` or `paid` — drafts are invisible.
- Writes that change status (`sent` → `paid`) happen via edge functions (service role).

### Schedule

- **pg_cron**, daily 07:00 SAST, calls the new **`billing-cycle`** edge function.
- When today is 2 days before month-end **or later** (self-healing if a run is missed): for every active tenancy without a bill for the current period, create an `awaiting_landlord` bill with rent auto-filled, and insert a landlord notification: *"Billing information needed for [property] — add this month's expenses."*
- Idempotent via the unique `(tenancy_id, period)` constraint — safe to re-run.

## 3. Landlord flow — Payments tile

- The landlord Payments page shows a **"Billing due"** section when an `awaiting_landlord` bill exists.
- Bill form: rent pre-filled (read-only) · preset expense amount fields (Water, Sewage, Electricity, Refuse — blank each month, no prefill) · "Add other charge" (label + amount) · live total · **Send to tenant**.
- Nothing is sent until the landlord submits (even if that's after month-end). The notification stays actionable until then.
- After sending: bill shows as "Sent — awaiting payment"; flips to "Paid" with receipt attached when payment clears.
- **Send is blocked if the landlord has no Paystack subaccount** — the form explains rent collection setup must be completed first (expenses can still be filled in meanwhile).

## 4. Rent Collection onboarding

- Landlord dashboard gains a **"Rent collection"** tile, appearing once the landlord has ≥1 property:
  - **No subaccount:** "Set up" state → bank picker (`list-paystack-banks`), account number, account name → `create-paystack-subaccount`.
  - **Subaccount exists:** shows status, e.g. "Active — payouts to FNB ••1234" (a home for payout settings; the tile does not disappear).
- **Lease fallback (existing, verified as part of this work):** if the landlord reaches lease creation without a subaccount, the banking details entered for the lease create the subaccount automatically; the tile then reads "Active".

## 5. Tenant flow — banner, bill, POP tile

- **Banner:** red alert bar with white **"Pay now"** pill, rendered in the tenant app root layout above every page whenever a `sent` unpaid bill exists. Driven by a Supabase realtime subscription (appears the moment the landlord sends; clears the moment payment is confirmed). Bar tap → bill detail; pill tap → straight to payment. It persists until `paid` — viewing does not dismiss it.
- **Bill detail:** property, period, rent line, each expense line, total, "Pay now".
- **Payment:** `initialize-paystack-transaction` with amount = total, subaccount = landlord's, reference = bill id → Paystack checkout (existing `PaystackWebView`/checkout pattern).
- **POP tile** becomes the tenant payment home:
  - "Current bill" section while unpaid.
  - Payment history: every paid bill with downloadable receipt PDF.
  - Existing manual proof-of-payment upload remains as a secondary tab (for tenants paying outside the app).

## 6. Payment completion & receipts

On `charge.success` webhook (existing handler, extended):

1. Verify Paystack signature; match `reference` to the bill.
2. Mark bill `paid` (`paid_at`, reference stored).
3. Generate a numbered, itemized **receipt PDF** (following the `generate-lease-pdf` pattern); store in Supabase storage; save path on the bill.
4. **Email** the receipt to tenant and landlord (existing email infrastructure).
5. Insert landlord **in-app notification**: "Rent paid — view receipt".
6. Tenant banner clears automatically (status change propagates via realtime).
7. **SwiftBooks auto-entry:** insert income transactions for the landlord — rent plus each recovered utility, properly categorized, tagged `auto` to distinguish from manual entries.
8. The platform's own record is the `monthly_bills` table itself (queryable from the admin app later; no separate receipt copy needed).

## 7. SwiftBooks redesign — "Calm ledger"

Keep all functionality; declutter the surface. Same `transactions` table, **no data migration**.

- **Overview screen:** net-income hero for the selected period + trend sparkline → income/expense summary chips → auto-fed recent transactions ledger (auto entries badged `auto`) → compact toolbar linking to Transactions, Reports (expense summary), Tax Invoices, AI Insights.
- **Remove:** sample/fake chart data fallbacks (real data only, proper empty state); the four-chart wall (line/area/bar/pie) on the overview.
- **Keep/move:** a single cashflow chart lives inside Reports; property filter and month/period picker stay.
- **Consolidate:** add-income / add-expense modals fold into the existing TransactionWizard.
- Aesthetic follows `.impeccable.md`: iOS-inspired, Inter, calm and trustworthy, light + dark both polished.

## Error handling

- **Webhook retries / double delivery:** marking `paid` is idempotent (status check before side effects); receipts and book entries are generated once (guarded by `receipt_pdf_path` / existing-transaction checks).
- **Payment failure/abandonment:** bill stays `sent`; banner persists; tenant can retry from banner or POP tile.
- **PDF or email failure after successful payment:** payment state still commits; receipt generation retried via the webhook handler's error path (never block `paid` on receipt delivery).
- **Missing subaccount at send time:** blocked in UI and re-checked server-side.
- **Cron overlap/downtime:** daily run is idempotent; a missed day self-heals on the next run (bills are created when `today >= month-end − 2 days` and no bill exists for the period, not only on the exact day).

## Testing

- **Edge functions:** unit-test `billing-cycle` date logic (month lengths, February, idempotency) and webhook handling (signature, double delivery, unknown reference).
- **End-to-end (test mode):** create tenancy → cron creates draft → landlord fills expenses → tenant sees banner → pay with Paystack test card → webhook → receipt + emails + notification + SwiftBooks entries. Verify banner clears.
- **RLS:** tenant cannot read `awaiting_landlord` bills; landlord cannot read other landlords' bills.
- **UI:** banner persistence across all tenant routes; TEST MODE badge visibility; SwiftBooks empty state with zero transactions.

## Out of scope

- Platform service fees on rent (explicitly: no cut taken).
- Late fees, partial payments, payment plans.
- Supplementary/second bills in a month.
- Multi-currency (ZAR only).

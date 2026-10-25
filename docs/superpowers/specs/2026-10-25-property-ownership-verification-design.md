# Property Ownership Verification — Design Spec

**Date:** 2026-10-25
**Scope:** Gate public listing (`AddProperty.tsx` → `ListProperty.tsx`) behind two one-time checks: title-deed ownership verification (property-level) and landlord identity verification (landlord-level, via the existing KYC pipeline). `AddPropertyUnlisted.tsx` (direct/invited-tenant properties, never publicly listed) is explicitly out of scope.
**Approach:** Extend existing patterns rather than build parallel ones — the existing `enforce_publish_paywall` trigger, the existing generic (not tenant-specific) `kyc_profiles` pipeline, and the existing `notify_on_*` trigger convention.

## Goals

- A landlord cannot publish a property to the public marketplace unless they've proven they own it (title deed, verified) and proven who they are (KYC, approved) — enforced at the database level, not just the UI.
- No real title-deed verification API exists yet. The verification *decision* must be a single, swappable point (manual admin review for v1) so wiring in a real automated deeds-lookup later requires no changes anywhere else in the system.
- Both checks are one-time facts, not repeated per listing: ownership is tied to the property record; identity is tied to the landlord's account and already covers every future listing once approved.
- Reuse existing infrastructure wherever the shape already matches (KYC pipeline, paywall trigger, admin review pattern, generic `events` audit log) rather than introduce new tables/buckets/edge-function patterns that duplicate something that already exists.

## Non-goals (this round)

- Integrating a real deeds-registry API — this spec builds the workflow with verification always landing in manual review; swapping in automation is explicitly deferred.
- Any change to `AddPropertyUnlisted.tsx` or its properties.
- Any change to the existing payment/paywall logic itself (`can_publish_property`) beyond adding two earlier checks in the same trigger.
- A landlord-facing UI for the KYC flow, if the audit below finds one doesn't already exist for the landlord app — that's flagged as an implementation-time check, not designed here.

## 1. Data model — one migration

Add nullable columns to `public.properties`:

| Column | Type | Notes |
| --- | --- | --- |
| `title_deed_path` | text | Storage path in the new `title-deeds` bucket; null until uploaded |
| `ownership_status` | `ownership_verification_status` (new enum: `pending`/`verified`/`declined`) | Default `pending` |
| `ownership_verified_at` | timestamptz | Set when status moves to `verified` |
| `ownership_reviewed_by` | uuid, references `auth.users` | The admin who made the call |
| `ownership_decline_reason` | text | Shown to the landlord so they know what to fix before re-uploading |

No new table for landlord identity — `kyc_profiles` is already keyed by `user_id` alone (not tenant-specific: `id_front_path`, `id_back_path`, `status`, `reviewed_by`, `reviewed_at`), and is reused as-is. The new rule is purely at the enforcement layer (§3): a landlord's first listing requires `kyc_profiles.status = 'approved'` for their own `user_id`.

## 2. Storage

New bucket `title-deeds` (private), path convention `<property_id>/deed.<ext>`:

- Set `file_size_limit = 10MB` and `allowed_mime_types = {application/pdf, image/jpeg, image/png}` **at bucket creation** — several existing buckets in this project don't have these set, a gap already flagged in an earlier security review; no reason to repeat it here.
- RLS: the property's landlord (`landlord_id = auth.uid()` via a join, same join-pattern as the existing `id-documents`/`lease-documents` policies) can insert/update/select their own; `is_admin()` can select any; no one else, no public access.

The landlord ID document reuses the existing `kyc-uploads` bucket and its RLS as-is — no bucket changes there.

## 3. Enforcement — extend the existing trigger

`enforce_publish_paywall()` already blocks `is_listed=true` unless `can_publish_property()` passes, raising `'PUBLISH_PAYWALL: ...'` (a prefix `ListProperty.tsx` already string-matches to show the paywall modal). Add two more checks in the same trigger, **before** the existing payment check, each with its own distinct, catchable prefix:

```sql
IF NEW.is_listed IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_listed IS DISTINCT FROM TRUE) THEN
  IF NEW.ownership_status IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'OWNERSHIP_NOT_VERIFIED: title deed ownership must be verified before publishing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.kyc_profiles WHERE user_id = NEW.landlord_id AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'IDENTITY_NOT_VERIFIED: landlord identity (KYC) must be approved before publishing';
  END IF;
  IF NOT public.can_publish_property(NEW.id, NEW.landlord_id) THEN
    RAISE EXCEPTION 'PUBLISH_PAYWALL: publishing requires an active subscription or a once-off listing fee';
  END IF;
END IF;
```

Order is deliberate and guides the landlord through the right next step: ownership (should already be true by listing time — this is a defense-in-depth backstop, not the primary gate) → identity (first listing only) → payment (every listing, unchanged behaviour).

## 4. UI flow

- **`AddProperty.tsx`**: new title-deed upload step after the property record is created. Client uploads directly to `title-deeds` and sets `title_deed_path`; `ownership_status` stays at its default `pending`. A new trigger `notify_on_title_deed_uploaded` (same shape as the existing `notify_on_kyc_status_change`) notifies the admin a review is waiting.
- **`ListProperty.tsx`**: extend the existing `publishErr.message?.includes(...)` branch to handle the two new prefixes — `OWNERSHIP_NOT_VERIFIED` shows a "still under review" state (or a re-upload prompt if the deed is missing entirely); `IDENTITY_NOT_VERIFIED` routes into the KYC flow.
  - **Implementation-time check, not designed here**: confirm whether a landlord-facing KYC upload UI already exists (the KYC edge functions — `kyc-create-capture-session`, `kyc-upload-capture` — may currently only be wired into the tenant app). If not, a minimal landlord-facing KYC upload screen is needed; it should reuse the existing KYC edge functions, not new ones.
- **`AddPropertyUnlisted.tsx`**: no changes.
- **Admin review**: a new section in the existing admin area (`apps/web/src/pages/admin/`) listing properties with `ownership_status='pending'` — a signed URL to the deed, property + landlord details, Approve/Decline (with a reason) actions. Two new edge functions, `admin-approve-property-ownership` / `admin-decline-property-ownership`, copying `kyc-admin-approve`/`kyc-admin-decline`'s exact auth pattern: verify the caller via `is_admin()`, then perform the update with the service-role client.

## 5. Error handling

- **Decline → re-upload**: re-uploading resets `ownership_status` to `pending` and clears `ownership_decline_reason` going forward; the decline event itself is logged to the existing generic `events` table (no new audit table).
- **Missing/oversized/wrong-type file**: caught client-side against the bucket's `file_size_limit`/`allowed_mime_types` before upload; the storage call itself is the server-side backstop.
- **Review backlog**: add the title-deed queue to the daily review routine already documented in `founder/ops.md` §1/§4, alongside the existing KYC queue — this is a solo-founder operational risk already named in that document, not a new one.

## 6. Testing

Trigger logic (`enforce_publish_paywall`), as a matrix:

| Ownership | KYC | Payment | Result |
| --- | --- | --- | --- |
| not verified | — | — | blocked, `OWNERSHIP_NOT_VERIFIED` |
| verified | not approved | — | blocked, `IDENTITY_NOT_VERIFIED` |
| verified | approved | not paid | blocked, `PUBLISH_PAYWALL` (existing behaviour, unchanged) |
| verified | approved | paid | publishes |

Manual/integration: full click-through — add property → upload deed → admin approves ownership → attempt to list → routed to KYC → admin approves KYC → attempt to list → routed to payment → pay → listed. Also verify a decline at either step correctly blocks and shows the reason, and that a re-upload after decline returns to `pending` and re-notifies the admin.

## Open questions carried into implementation (not blocking this spec)

1. Does a landlord-facing KYC upload UI already exist, or does a minimal one need to be built reusing the existing edge functions? (§4)
2. Exact enum/constraint naming to match this codebase's existing conventions (check how other status enums are named before creating `ownership_verification_status`).

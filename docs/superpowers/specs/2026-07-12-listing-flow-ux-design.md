# Listing Flow UX & Validation Improvements — Design Spec

**Date:** 2026-07-12
**Scope:** The landlord *rental* listing wizard (`/list-property`). The for-sale flow is out of scope this round; shared components must keep compiling with today's behaviour for the sale flow.
**Approach:** Evolve the existing 6-step wizard in place. Keep the current design system, routes, paywall intercept, and edit-existing-property path working throughout.

## Goals

- Reduce landlord mistakes before publishing; increase confidence.
- Make autosave visible and drafts durable ("no data should ever be lost").
- Bring property types, terminology, and validation in line with the South African rental market.
- Keep the flow feeling premium, calm, and fast — plain South African English, inline validation, no blocking popups.

## Current state (audit summary)

Flow: Dashboard → `/listing-type` (Rent vs Sale) → `ListProperty.tsx` wizard with 6 steps: Property Type → Location → Details → Pricing → Photos → Review → Publish (paywall may intercept).

Key gaps found:

1. **Property type:** 6 flat options; "Apartment" and "Flat" are confusing duplicates; no Duplex, Garden Cottage, Student Accommodation, Commercial, or Other-with-custom-input.
2. **Autosave:** localStorage-only, saved silently on every change; photos are excluded from the draft so they are always lost; no visible save indicator; drafts don't follow the landlord across devices.
3. **Validation:** price has hard R1,000–R100,000 limits but no soft warnings; no bathroom-vs-bedroom sanity check; address is a single free-text `location` string (no province/postcode anywhere, not even in the DB); a listing can be published with **zero photos**.
4. **Photos:** "Drag to reorder" text exists but drag is not wired (dead `reorderImages` code); no minimum, no recommended-shots guidance, no upload progress or retry; all photos upload silently at publish time.
5. **Review & publish:** no per-section edit buttons, no missing-info warnings, no landlord declaration, generic "Publishing…" label.

## 1. Data model — one migration

Add nullable columns to `public.properties`:

| Column | Type | Notes |
|---|---|---|
| `street_address` | text | Optional (landlord privacy) |
| `suburb` | text | Required by wizard validation |
| `city` | text | Required by wizard validation |
| `province` | text | Required; one of the 9 SA provinces |
| `postal_code` | text | Required; 4 digits |

- All columns nullable at the DB level so existing rows and the sale flow are unaffected. Requiredness is enforced by wizard validation, not constraints.
- The existing `location` string remains the display/search field. The wizard composes it as `"{suburb}, {city}, {province}"` on save, so everything that reads `location` today keeps working.
- Google Places autocomplete already returns structured address components via `onPlaceSelect` (currently discarded). The Location step parses them into the individual fields; the landlord can correct any field manually.
- **No draft-status column.** A draft is an unlisted property row (`is_listed = false`) — this concept already exists (dashboard shows unlisted properties with a Publish action; the paywall already saves drafts this way).

## 2. Property Type step — SA market

Replace the 6 generic cards with a grouped, scannable selection using SA terminology. Groups render as headed sections; options are cards consistent with the current selected/unselected styling.

| Group | Option | Helper text |
|---|---|---|
| Homes | House | Standalone home with its own entrance |
| Homes | Townhouse | Home in a complex or estate, often with shared walls |
| Homes | Duplex | Two-storey unit or a home split into two dwellings |
| Flats & cottages | Apartment / Flat | Unit in a block — incl. bachelor & studio flats |
| Flats & cottages | Garden Cottage / Flatlet | Separate unit on a shared property |
| Rooms & shared | Room to Rent | Private room in a shared home |
| Rooms & shared | Student Accommodation | Housing aimed at students, incl. commune rooms |
| Other | Commercial Property | Office, retail or industrial space |
| Other | Other | Reveals a short required text input for a custom type |

- Selecting **Other** reveals an inline text input (max 40 chars, required while Other is selected); the custom text is stored in `property_type`.
- Existing listings with legacy values ("Studio", "Flat", etc.) still render everywhere — only the selector changes. When editing such a property, if its `property_type` doesn't match a card, the Other card is pre-selected with the value in the custom input.

## 3. Autosave & server-side drafts

New hook `packages/features/src/listing/hooks/useListingDraft.ts` owns draft lifecycle and save state:

- **Draft creation:** when step 1 completes (property type chosen → Continue), insert the property row with `is_listed = false`, `landlord_id`, `property_type`, and safe placeholder values for any NOT NULL columns (e.g. `price 0`, `title ''`, `location ''`). The returned id becomes the wizard's `propertyId`.
- **Saves:** update the row on every step completion, on field blur (debounced ~800 ms), and on photo add/remove/reorder. Only changed fields are sent.
- **Save state machine:** `idle → saving → saved → idle`, with `error` on failure. Failures auto-retry with backoff; the user sees "Couldn't save — retrying". No data-loss dialogs.
- **`SaveStatusIndicator`** component (in `packages/features/src/listing/components/`): muted text + small icon rendered top-right beside the wizard title. Copy: "Saving…", "Saved just now" (first ~10 s after a save), then "Draft saved".
- **Resume:** entering the wizard without a `propertyId`, the hook looks for the landlord's most recent incomplete unlisted draft. If found, show the existing AlertDialog upgraded to: title "Continue where you left off?", body summarising the draft (property type + how far they got), actions **"Continue where you left off"** / **"Start a new listing"**. Starting new leaves the old draft untouched (it remains visible on the dashboard as unlisted).
- **Resume step:** derived from data completeness — the first step whose required fields are missing. Last-viewed step is also stored in localStorage keyed by draft id and wins when it's ≥ the derived step (same device convenience); other devices fall back to the derived step.
- **Editing an existing property** (`?propertyId=`) uses the same hook — autosave updates that row directly; no localStorage draft slot involved (removes the current leak-prevention special case).
- The old whole-form localStorage draft (`listing_form_draft`) is retired: on wizard mount the key is deleted if present. Server drafts fully replace it.

## 4. Photos step — upload-as-you-go

New `PhotoUploader.tsx` component (extracted from PhotosStep):

- **Immediate uploads:** each added photo starts uploading to the `property-images` bucket at once. Tile shows a progress bar during upload, ✓ when done, and an error state with a **Retry** button on failure. The `images` array (URLs) is autosaved after each successful upload. Publishing no longer uploads anything.
- **Removing** a photo removes it from `images` and best-effort deletes the storage object.
- **Progress header:** "N of 10 recommended photos" with a progress bar. Rule line: "5 minimum · 10+ recommended". Under 5 photos the bar/count renders in amber; at ≥ 5 it turns green up to the recommended 10.
- **Recommended shots** as guidance chips above the grid: Front exterior · Living room · Kitchen · Main bedroom · Bathroom, with the nudge line: "Listings with more quality photos receive significantly more tenant enquiries." (Guidance only — no per-photo tagging.)
- **Reordering:** real drag-and-drop via `@dnd-kit/core` + `@dnd-kit/sortable` (touch-friendly, accessible). Each tile also has a "Make cover photo" action that moves it to position 0. First image = cover, badged **"Cover"** (replaces "Main Photo").
- **Quality tips** card stays, positioned above the upload zone so it's read before uploading.
- Existing constraints kept: max 15 photos, JPG/PNG/WebP, 10 MB each, with the current toast messaging.

## 5. Validation — inline, helpful, never popups

New module `packages/features/src/listing/validation.ts`: pure functions for all rules below (hard rules return errors, soft rules return warnings), unit-tested with Vitest. Steps consume it via react-hook-form rules plus a small inline `FieldWarning` presentation (amber text + icon under the field; red is reserved for blockers).

| Field | Hard rule (blocks) | Soft warning (amber, non-blocking) |
|---|---|---|
| Price | Required; R500 ≤ price ≤ R500,000 | < R2,000: "That's unusually low — double-check the amount." > R75,000: "That's unusually high for a rental — double-check the amount." |
| Bedrooms | Required; integer 0–20 (0 = bachelor) | — |
| Bathrooms | Required; integer 1–20 | If bathrooms > bedrooms + 2: inline confirm ("6 bathrooms for 2 bedrooms — is that right?") with a checkbox that must be ticked to continue the step |
| Suburb / City / Province | Required; province from a dropdown of the 9 SA provinces | — |
| Postal code | Required; exactly 4 digits | — |
| Street address | Optional | — |
| Description | Required; ≥ 50 chars (existing) | < 150 chars: "Short descriptions get fewer enquiries — mention the layout, features and the area." Live character count shown |
| Photos | ≥ 5 to publish (enforced on Review) | < 10: encouragement to add more |
| Contact | Profile must have a phone number to publish | — |

- **Contact check (Review step):** if the landlord's profile has no phone number, show an inline card with a phone input (SA format: `0XXXXXXXXX` or `+27XXXXXXXXX`) that saves to `profiles` on blur. Publishing is blocked until present. No new wizard step; enquiries remain in-app.
- The Location step becomes an address form: Google Places autocomplete on top (auto-fills the fields below from address components), then Street address (optional), Suburb, City, Province (Select), Postal code. Description stays on this step with its AI-generate button.

## 6. Review & Publish — trust and honest progress

- **Per-section Edit:** each summary section (Property type, Address, Details, Pricing & availability, Photos, Description) gets an Edit button that jumps to that step; the wizard remembers it came from Review and the step's Continue returns straight to Review.
- **"Before you publish" checklist** card at the top of Review:
  - Red (blocking): fewer than 5 photos · missing required address fields · no phone number on profile · any hard validation failure.
  - Amber (advisory): description under 150 characters · no parking information (parking_spaces empty/0 and no parking amenity) · no amenities selected.
  - Each item links/scrolls to the fix. Publish is disabled while red items exist.
- **Landlord declaration:** required checkbox above the Publish button: *"I confirm that the information provided is accurate and that I am authorised to advertise this property."* Publish stays disabled until ticked. Not persisted to the DB this round.
- **Publish progress:** replace the single "Publishing…" label with staged status text driven by the real operations: "Verifying information…" (final validation + save) → "Finalising listing…" (row update) → "Publishing to MzanziHomes…" (`is_listed` flip) → success. Photos are already uploaded by this point, so stages are honest and quick.
- Existing success dialog (confetti + next steps) and the paywall intercept are unchanged.

## 7. File structure

| File | Change |
|---|---|
| `supabase/migrations/<ts>_property_address_fields.sql` | New: 5 nullable address columns |
| `packages/features/src/listing/types.ts` | Extend `ListingFormData` with address fields |
| `packages/features/src/listing/validation.ts` | New: pure validation/warning rules + SA provinces list |
| `packages/features/src/listing/validation.test.ts` | New: Vitest unit tests for every rule |
| `packages/features/src/listing/hooks/useListingDraft.ts` | New: draft lifecycle, autosave, save state, resume |
| `packages/features/src/listing/components/SaveStatusIndicator.tsx` | New |
| `packages/features/src/listing/components/PhotoUploader.tsx` | New: immediate uploads, progress, retry, dnd-kit reordering, cover |
| `packages/features/src/listing/components/PropertyTypeStep.tsx` | Rework: grouped SA types + Other input |
| `packages/features/src/listing/components/LocationStep.tsx` | Rework: structured address form + description |
| `packages/features/src/listing/components/DetailsStep.tsx` | Add bathroom sanity confirm, bounds |
| `packages/features/src/listing/components/PricingStep.tsx` | New bounds + soft warnings |
| `packages/features/src/listing/components/PhotosStep.tsx` | Slim wrapper around PhotoUploader + guidance |
| `packages/features/src/listing/components/ReviewStep.tsx` | Edit buttons, checklist, declaration, contact check |
| `apps/landlord/src/pages/ListProperty.tsx` | Slim to wizard chrome; wire useListingDraft; staged publish |

- Shared components used by the sale flow gain **optional props defaulting to current behaviour** so `ListSale.tsx` compiles and behaves as today.
- New dependency: `@dnd-kit/core` + `@dnd-kit/sortable` (small, tree-shakeable, touch + keyboard accessible).

## Error handling

- Autosave failures: silent auto-retry with backoff, indicator shows "Couldn't save — retrying"; a toast only if retries keep failing for > 30 s.
- Photo upload failures: per-tile error state with Retry; never lose other photos.
- Draft creation failure (step 1 → 2): toast with retry; wizard stays on step 1 with data intact in the form.
- Publish failure: existing destructive toast retained; paywall path (`PUBLISH_PAYWALL`) unchanged.

## Testing

- Vitest unit tests for `validation.ts` (every hard rule and soft warning, SA phone + postal formats) and `useListingDraft` state transitions (mocked supabase client).
- Typecheck baselines must hold (web 12, landlord 14, tenant 19).
- Manual Playwright pass on landlord dev server at mobile viewport: full happy path, draft resume, photo retry, review checklist, declaration gating, publish stages.

## Out of scope

- Sale flow polish (contact step, sale pricing, seller documents).
- Per-photo room tagging or AI photo quality scoring.
- Backfilling structured address data for existing listings.
- Persisting the declaration acknowledgement to the database.

# Add Property (Unlisted) + Tenant Invite Link + Mobile Listing Choice

**Date:** 2026-04-14  
**Status:** Approved — ready for implementation

---

## Overview

Three interconnected workflow improvements for landlords who already have tenants and properties but want to use the platform's management tools without a public listing:

1. **Add Property (Unlisted)** — create a property record without publishing it; use all management tools (maintenance, documents, payments) privately. Publish later with one tap.
2. **Tenant Registration Link** — landlord generates a shareable link pre-filled with rent and lease dates; tenant visits, authenticates, fills a lightweight form, and is linked to the property as an active tenant.
3. **Mobile Listing Choice Page** — tapping "+" on mobile goes to a full-screen choice page (List for Rent / List for Sale / Add Property Unlisted) instead of jumping straight to the listing wizard.

---

## Data Model

### `properties` table — new column

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `is_listed` | `boolean` | `true` | `false` = private/unlisted property |

- All existing properties default to `true` (no visible change).
- Public listing queries (`Properties` page, `SaleListings` page) add `.eq('is_listed', true)`.
- The `AddProperty` wizard sets `is_listed: false` on insert; `ListProperty`/`ListSale` continue to set `is_listed: true`.

### `property_invites` table — new table

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `property_id` | `uuid` FK → `properties.id` | |
| `landlord_id` | `uuid` FK → `auth.users.id` | |
| `token` | `text` UNIQUE | `nanoid(10)` — used in the public URL |
| `monthly_rent` | `numeric` | Rent amount set by landlord |
| `lease_start` | `date` | |
| `lease_end` | `date` NULLABLE | `null` = ongoing |
| `used_at` | `timestamptz` NULLABLE | Set when tenant accepts |
| `tenant_id` | `uuid` NULLABLE FK → `auth.users.id` | Set on acceptance |
| `created_at` | `timestamptz` | |

**RLS:**
- Landlord can insert/select/delete their own invites (`landlord_id = auth.uid()`).
- Anyone can read a single row by token (needed for unauthenticated tenant landing page).
- Tenant can update `used_at` and `tenant_id` when accepting.

---

## Feature 1 — Add Property (Unlisted)

### Listing Choice Page (`/listing-type`)

Route: `/listing-type`  
Triggered by: mobile "+" bottom bar button (replaces direct link to `/list-property`)

**Layout:** Full-screen page, 3 stacked full-width cards:

| Card | Icon | Label | Destination |
|------|------|-------|-------------|
| Blue border | 🏠 | List for Rent | `/list-property` |
| Green border | 🏷️ | List for Sale | `/list-sale` |
| Purple border | 🔧 | Add Property (Unlisted) | `/add-property` |

Yellow tip below cards: "Add Property (Unlisted) lets you use all management tools — maintenance, leases, payments — without appearing in public search."

### Add Property Wizard (`/add-property`)

Same form as `ListProperty` (address, type, bedrooms, photos) but:
- Title: "Add Your Property"
- No rent/price fields (irrelevant without listing)
- Submits with `is_listed: false`, `listing_type: null` (unknown until published; set to `'rental'` or `'sale'` when the landlord taps "Publish Listing")
- Success toast: "Property added — manage it from your dashboard."

### Dashboard — Unlisted Property Badge

In `MyProperties` / dashboard property cards:
- Listed properties: green `LISTED` badge (existing)
- Unlisted properties: purple `UNLISTED` badge, dashed purple border
- Unlisted card footer: "Manage" button + "✦ Publish Listing" button (purple fill)
- "Publish Listing" → navigates to `/listing-type?propertyId={id}` so the listing wizard pre-fills the existing property rather than creating a new one

### Public Listing Queries

Add `.eq('is_listed', true)` filter to:
- `src/pages/Properties.tsx` (rental search)
- `src/pages/SaleListings.tsx` (sale search)

---

## Feature 2 — Tenant Registration Link

### Landlord — Generate Invite (inside PropertyManagement → Tenants tab)

When no tenant is linked, the Tenants tab shows an empty state with a "Generate Tenant Invite Link" button.

Clicking opens an inline dialog:
- **Monthly Rent (R)** — number input
- **Start Date** — date picker
- **End Date (optional)** — date picker, placeholder "Ongoing"
- "Generate Link" button → inserts row into `property_invites`, returns token

Generated link displayed: `{window.location.origin}/join/{token}`  
Share buttons: **WhatsApp** (opens `wa.me/?text=...`), **Copy Link** (clipboard), **Email** (`mailto:?body=...`)

### Tenant — Join Page (`/join/:token`)

**Step 1 — Property Preview (public, no auth)**  
Fetch invite row by token. If `used_at` is set → show "This invite has already been used." error.  
Display:
- Property address + type
- Landlord name
- Monthly rent
- Move-in date

**Step 2 — Auth Gate**  
Email + password fields. "Continue" signs in or registers.  
Existing users: sign in and proceed.  
New users: create account (email + password), then proceed to Step 3.

**Step 3 — Confirm Details**  
Lightweight form:
- Full name
- SA ID number
- Phone number

"Accept & Register as Tenant" (green) button:
1. Upserts `profiles` row with name, phone, ID number for the authenticated user. (**Migration required:** add `phone text` and `id_number text` columns to `profiles` if they don't already exist.)
2. Inserts row into `tenancies`: `{ property_id, landlord_id, tenant_id: auth.uid(), monthly_rent, lease_start, lease_end, status: 'active' }`.
3. Updates `property_invites` row: `{ used_at: now(), tenant_id: auth.uid() }`.
4. Redirects tenant to `/dashboard` (their home page) with a success toast.

**Post-acceptance — Landlord side**  
The Tenants tab polling / realtime subscription detects the new tenancy row and replaces the invite UI with the linked tenant card (name, email, move-in date, rent amount).

---

## Feature 3 — Mobile Listing Choice (summary, already covered in Feature 1)

The `/listing-type` page also replaces the desktop "Add property" CTA from the empty dashboard state. If a `propertyId` query param is present, the choice cards navigate to the wizard with that ID pre-loaded so the existing property gets a listing created rather than a duplicate property record.

---

## Routes & Navigation

| New Route | Component | Notes |
|-----------|-----------|-------|
| `/listing-type` | `ListingTypePage` | Full-screen choice page |
| `/add-property` | `AddProperty` | Unlisted property wizard |
| `/join/:token` | `JoinPage` | Tenant registration via invite link |

**Mobile bottom bar:** "+" button → `/listing-type` (was `/list-property`)

---

## Error States

| Scenario | Handling |
|----------|---------|
| Token not found | "This invite link is invalid." |
| Invite already used | "This invite has already been used." |
| Tenant already linked to this property | Skip insert, show "You're already linked to this property." |
| User not authenticated on join page | Stay on page, show auth gate (Step 2) |

---

## Scope Constraints

- No email notifications (WhatsApp/copy/email share is manual by landlord).
- No invite expiry — invites are single-use (used_at) but never expire automatically.
- Tenant form data (SA ID, phone) stored in existing `profiles` table — no new tables.
- "Publish Listing" in dashboard routes to the existing `ListProperty`/`ListSale` wizard; it does not duplicate the property.

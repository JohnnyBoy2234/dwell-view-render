
# Big Change: Property Management Without Listing + Tenant Invite Link

## What This Changes

Right now, when a landlord adds a property, it's immediately listed publicly as "available" for anyone to find. This change separates **property management** from **public listing**, so landlords can:

1. Add a property just to manage it privately (no public listing)
2. Invite their tenant directly via a shareable link
3. When a tenant signs up through that link, they're automatically connected to the property
4. Optionally list the property publicly later with a single tap
5. Get lease renewal prompts when it's time, with the option to use the platform's lease or upload their own

---

## How It Will Work (User Flow)

```text
LANDLORD FLOW:
Add Property → Choose: "Manage Only" (default) or "List Publicly"
                    │                              │
                    ▼                              ▼
           Property saved with              Property saved with
           status = "unlisted"              status = "available"
                    │
                    ▼
           Dashboard shows property
           with all management tools
                    │
                    ▼
           "Invite Tenant" button →  Generates shareable link
                    │
                    ▼
           Tenant clicks link → Signs up / logs in
                    │
                    ▼
           Tenant auto-linked to property (tenancy created)
                    │
                    ▼
           Landlord prompted: "Create lease?"
           → Use our lease wizard  OR  Upload own lease PDF
                    │
                    ▼
           Later: "List Property" button makes it public
```

```text
TENANT FLOW:
Receives invite link (WhatsApp, email, SMS, etc.)
         │
         ▼
   Clicks link → /join/:token
         │
         ├── Already has account? → Login → Auto-linked
         │
         └── New user? → Sign up → Auto-linked
                              │
                              ▼
                    Tenant dashboard shows property
                    All tools available (maintenance, payments, etc.)
```

---

## Technical Changes

### 1. Database Migration: Add `tenant_invites` Table + Update Properties Default Status

**New table: `tenant_invites`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| token | text | Unique shareable token |
| property_id | uuid | FK to properties |
| landlord_id | uuid | FK to profiles |
| tenant_email | text | Optional - if landlord knows the email |
| status | text | `pending`, `accepted`, `expired` |
| created_at | timestamp | When created |
| accepted_at | timestamp | When tenant joined |
| accepted_by | uuid | The tenant user who accepted |

**Properties table update:**
- Change default status from `available` to `unlisted`
- This means new properties are private by default

### 2. Add Property Page Changes

**File: `src/pages/AddProperty.tsx`**

- Add a toggle/choice at the bottom: "Manage Only" vs "List Publicly"
- Default to "Manage Only" (status = `unlisted`)
- If "List Publicly" chosen, status = `available`
- Update success message: "Property added! Invite your tenant or list it publicly."

### 3. New Edge Function: `create-tenant-invite`

Creates a `tenant_invites` record and returns a shareable link. The link format: `https://yourapp.com/join/{token}`

- Generates a unique token
- Stores in `tenant_invites` table
- Returns the full URL for sharing

### 4. New Page: Tenant Join (`/join/:token`)

**New file: `src/pages/TenantJoin.tsx`**

- If user is logged in: automatically accept the invite, create tenancy record, redirect to tenant dashboard
- If user is not logged in: redirect to auth page with a `?redirect=/join/{token}` parameter so they come back after signup/login
- On acceptance:
  - Create a `tenancies` record linking tenant to property
  - Update property status to `occupied` if desired
  - Update invite status to `accepted`
  - Send notification to landlord

### 5. Dashboard: "Invite Tenant" Button

**File: `src/pages/EnhancedLandlordDashboard.tsx`**

- Add "Invite Tenant" button on each property card (when property has no active tenant)
- Shows a dialog with:
  - Generated invite link (copy to clipboard / share via WhatsApp)
  - Optional: enter tenant email to send directly
- Add "List Property" button for unlisted properties to make them public

### 6. Dashboard: Property Status Display Updates

**Files: `PropertyCard.tsx`, `PropertyManagementSection.tsx`, `PropertySelection.tsx`**

- Show `unlisted` status as "Private / Not Listed" badge
- Show "List Property" button for unlisted properties
- Show "Invite Tenant" button prominently
- All management tools remain available regardless of listing status

### 7. Search/Browse Page Filter

**File: `src/pages/Properties.tsx`**

- Already filters by `status = 'available'`, so unlisted properties won't show - no change needed here

### 8. Lease Renewal Prompt

**File: `src/pages/EnhancedLandlordDashboard.tsx`**

- Check tenant lease end dates
- When a lease is within 60 days of expiring, show a "Lease Renewal" prompt
- Options: "Renew with our lease" (opens lease wizard) or "Upload your own lease" (file upload)

### 9. Route Registration

**File: `src/App.tsx`**

- Add route: `/join/:token` -> `TenantJoin` component

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/TenantJoin.tsx` | Tenant invite acceptance page |
| `src/components/landlord/InviteTenantDialog.tsx` | Dialog for generating/sharing invite link |
| `src/components/landlord/ListPropertyButton.tsx` | Button to make unlisted property public |
| `src/components/landlord/LeaseRenewalPrompt.tsx` | Lease renewal notification component |
| `supabase/functions/create-tenant-invite/index.ts` | Edge function to create invite tokens |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/AddProperty.tsx` | Add "Manage Only" / "List Publicly" toggle, default to unlisted |
| `src/pages/EnhancedLandlordDashboard.tsx` | Add Invite Tenant button, List Property button, lease renewal prompts |
| `src/components/dashboard/PropertyCard.tsx` | Handle `unlisted` status display |
| `src/components/property/PropertyManagementSection.tsx` | Handle `unlisted` status, add invite button |
| `src/components/dashboard/PropertySelection.tsx` | Update empty state messaging |
| `src/App.tsx` | Add `/join/:token` route |
| `src/hooks/useLandlordMetrics.tsx` | Count unlisted properties separately |

## Database Migration

- Create `tenant_invites` table with RLS policies
- Optionally update properties default status (or handle in code)

---

## What Stays the Same

- All management tools (lease builder, maintenance, payments, inventory, etc.) work exactly the same regardless of listing status
- The search/browse page still only shows `available` properties
- Existing listed properties continue to work normally
- The existing application/screening flow remains for publicly listed properties

---

## Implementation Order

1. Database migration (tenant_invites table)
2. Add Property page changes (manage only / list toggle)
3. Create tenant invite edge function
4. Build InviteTenantDialog component
5. Build TenantJoin page + route
6. Update dashboard with invite/list buttons
7. Add lease renewal prompt
8. Update status displays across components

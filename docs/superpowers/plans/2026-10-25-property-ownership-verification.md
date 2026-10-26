# Property Ownership Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate public property listing behind two one-time checks — title-deed ownership (property-level, manual review for now) and landlord identity (landlord-level, via the existing KYC pipeline) — enforced at the database level, not just the UI.

**Architecture:** Extend the existing `enforce_publish_paywall` trigger on `properties` with two earlier checks; add title-deed upload to the existing `ListProperty.tsx` wizard's review step (there is no separately-routed "add property" page — `/add-property` and `/list-property` both render `ListProperty`); reuse the existing generic `kyc_profiles` pipeline for landlord identity (no new table); build the admin review UI into the already-scaffolded-but-empty `DocumentReview.tsx` page.

**Tech Stack:** Supabase (Postgres, Storage, Edge Functions/Deno), React + react-hook-form (`apps/landlord`), Vitest (`packages/features`). No local Docker/Supabase stack is available this session — migrations are applied directly to the live project (`rsfrvjaqxhoqavvscvwf`) via the Supabase MCP `apply_migration` tool and verified with direct SQL queries, matching how every other migration in this project's recent history was applied and verified.

**Corrections from the approved spec** (found while mapping exact files, as expected at this stage):
- The spec said "`AddProperty.tsx`" for the add-property step. That file exists but is **not routed anywhere** in `apps/landlord/src/App.tsx` — `/add-property`, `/list-property`, and `/list-rental` all render `ListProperty`. There is one real wizard, not two. The "upload at add-property time" / "require it again at list time" distinction from the spec becomes: upload happens as part of filling out the (single) wizard; the DB trigger enforces it at the actual publish attempt, same moment the payment check already fires.
- The spec proposed a new admin page. `apps/web/src/pages/admin/DocumentReview.tsx` already exists, already routed at `/admin/documents`, already has the right status-badge helpers (`getStatusIcon`/`getStatusColor`) — but `const documents: any[] = []` is a stub with no real data. Implementing into this existing file is more DRY than creating a parallel page.
- The spec's §1 named the new enum `ownership_verification_status` with values `pending`/`verified`/`declined`. This plan uses `property_ownership_status` with `not_submitted`/`submitted`/`verified`/`declined` instead, to mirror the existing `kyc_status` enum's 4-state shape exactly (the spec's own §1 says the new rule should reuse `kyc_profiles`' conventions, and `kyc_status` already distinguishes "nothing uploaded yet" from "uploaded, awaiting review" — collapsing those into one `pending` state would lose that distinction for no benefit).

---

## Task 1: Database migration — schema, storage, enforcement, notifications

**Files:**
- Create: `supabase/migrations/20261025120000_property_ownership_verification.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Property ownership verification: a one-time, property-level check (title
-- deed, manually reviewed for now — no real deeds API exists yet, see the
-- design spec) that gates publishing alongside the existing payment check.
-- Landlord identity reuses the existing, already-generic kyc_profiles
-- pipeline rather than a new table.

create type public.property_ownership_status as enum ('not_submitted', 'submitted', 'verified', 'declined');

alter table public.properties
  add column title_deed_path text,
  add column ownership_status public.property_ownership_status not null default 'not_submitted',
  add column ownership_verified_at timestamptz,
  add column ownership_reviewed_by uuid references auth.users(id),
  add column ownership_decline_reason text;

-- Storage: private bucket for title deeds, path convention <property_id>/deed.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('title-deeds', 'title-deeds', false, 10485760, array['application/pdf','image/jpeg','image/png']::text[])
on conflict (id) do nothing;

drop policy if exists "Landlords can upload their own title deeds" on storage.objects;
create policy "Landlords can upload their own title deeds"
on storage.objects for insert
with check (
  bucket_id = 'title-deeds'
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[1]
      and p.landlord_id = auth.uid()
  )
);

drop policy if exists "Landlords can update their own title deeds" on storage.objects;
create policy "Landlords can update their own title deeds"
on storage.objects for update
using (
  bucket_id = 'title-deeds'
  and exists (
    select 1 from public.properties p
    where p.id::text = (storage.foldername(name))[1]
      and p.landlord_id = auth.uid()
  )
);

drop policy if exists "Landlords and admins can view title deeds" on storage.objects;
create policy "Landlords and admins can view title deeds"
on storage.objects for select
using (
  bucket_id = 'title-deeds'
  and (
    exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and p.landlord_id = auth.uid()
    )
    or public.is_admin()
  )
);

-- Enforcement: extend the existing publish-paywall trigger with two earlier
-- checks. Order matters for UX — ownership (backstop, should already be
-- true by listing time) -> identity (first listing only) -> payment
-- (every listing, existing behaviour unchanged).
create or replace function public.enforce_publish_paywall()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
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
  RETURN NEW;
END;
$function$;

-- Notifications: same three-branch shape as the existing notify_on_kyc_status_change.
create or replace function public.notify_on_ownership_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
BEGIN
  IF NEW.ownership_status IS DISTINCT FROM OLD.ownership_status THEN
    IF NEW.ownership_status = 'verified' THEN
      PERFORM public.create_notification(
        NEW.landlord_id,
        'Title deed verified — you can now publish this listing.',
        '/list-property?propertyId=' || NEW.id,
        'system',
        jsonb_build_object('property_id', NEW.id, 'ownership_status', NEW.ownership_status)
      );
    ELSIF NEW.ownership_status = 'declined' THEN
      PERFORM public.create_notification(
        NEW.landlord_id,
        'Title deed verification needs attention',
        '/list-property?propertyId=' || NEW.id,
        'system',
        jsonb_build_object('property_id', NEW.id, 'ownership_status', NEW.ownership_status, 'reason', NEW.ownership_decline_reason)
      );
    ELSIF NEW.ownership_status = 'submitted' THEN
      INSERT INTO public.notifications (user_id, message, link_url, type, metadata)
      SELECT ur.user_id,
             'New title deed submitted for ownership review',
             '/admin/documents',
             'system',
             jsonb_build_object('property_id', NEW.id)
      FROM public.user_roles ur
      WHERE ur.role = 'admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

drop trigger if exists trg_notify_on_ownership_status_change on public.properties;
create trigger trg_notify_on_ownership_status_change
after update on public.properties
for each row
execute function public.notify_on_ownership_status_change();
```

- [ ] **Step 2: Apply the migration to the live project**

Use the Supabase MCP `apply_migration` tool with `project_id: rsfrvjaqxhoqavvscvwf`, `name: property_ownership_verification`, and the exact SQL from Step 1. (CLI fallback if MCP is unavailable: `supabase db push` after `supabase link --project-ref rsfrvjaqxhoqavvscvwf`.)

- [ ] **Step 3: Verify the enum, columns, and bucket exist**

Run this SQL (via the Supabase MCP `execute_sql` tool, or `psql`):

```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='properties' and column_name like 'ownership%' or column_name = 'title_deed_path';

select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'title-deeds';
```

Expected: 4 `ownership_*`/`title_deed_path` columns listed; one `title-deeds` row with `public=false`, `file_size_limit=10485760`.

- [ ] **Step 4: Verify the trigger blocks on ownership and identity**

Run this SQL to confirm the function body contains the new checks:

```sql
select pg_get_functiondef(oid) from pg_proc where proname = 'enforce_publish_paywall';
```

Expected: output contains both `OWNERSHIP_NOT_VERIFIED` and `IDENTITY_NOT_VERIFIED`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261025120000_property_ownership_verification.sql
git commit -m "feat: gate property publishing on title-deed and identity verification"
```

---

## Task 2: Extend `buildPublishChecklist` with the ownership blocker (TDD)

**Files:**
- Modify: `packages/features/src/listing/validation.ts`
- Test: `packages/features/src/listing/validation.test.ts`

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('buildPublishChecklist', ...)` block in `packages/features/src/listing/validation.test.ts` (after the existing "blocks a missing profile phone" test):

```ts
  it('blocks when the title deed has not been submitted', () => {
    const r = buildPublishChecklist(complete, '0821234567', 'not_submitted');
    expect(r.blockers.some((b) => /title deed/i.test(b))).toBe(true);
  });
  it('blocks while the title deed is pending review', () => {
    const r = buildPublishChecklist(complete, '0821234567', 'submitted');
    expect(r.blockers.some((b) => /review/i.test(b))).toBe(true);
  });
  it('blocks when the title deed was declined', () => {
    const r = buildPublishChecklist(complete, '0821234567', 'declined');
    expect(r.blockers.some((b) => /declined/i.test(b))).toBe(true);
  });
  it('does not block when the title deed is verified', () => {
    const r = buildPublishChecklist(complete, '0821234567', 'verified');
    expect(r.blockers.some((b) => /title deed/i.test(b))).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- packages/features/src/listing/validation.test.ts`
Expected: FAIL — `buildPublishChecklist` currently takes only 2 arguments, so the new `ownershipStatus` argument is silently ignored and no "title deed"/"review"/"declined" blocker is ever added. The 4 new assertions fail.

- [ ] **Step 3: Implement the minimal change**

In `packages/features/src/listing/validation.ts`, change the `buildPublishChecklist` signature and add the new check. Replace:

```ts
export function buildPublishChecklist(
  data: {
    suburb?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    description: string;
    parking_spaces?: number;
    amenities: string[];
    images: (File | string)[];
  },
  profilePhone: string | null | undefined
): PublishChecklist {
  const blockers: string[] = [];
  const warnings: string[] = [];
```

with:

```ts
export type OwnershipStatus = 'not_submitted' | 'submitted' | 'verified' | 'declined';

export function buildPublishChecklist(
  data: {
    suburb?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    description: string;
    parking_spaces?: number;
    amenities: string[];
    images: (File | string)[];
  },
  profilePhone: string | null | undefined,
  ownershipStatus?: OwnershipStatus
): PublishChecklist {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (ownershipStatus === 'not_submitted' || ownershipStatus == null) {
    blockers.push('Upload your title deed so we can verify you own this property.');
  } else if (ownershipStatus === 'submitted') {
    blockers.push('Your title deed is still under review — we’ll notify you once it’s verified.');
  } else if (ownershipStatus === 'declined') {
    blockers.push('Your title deed was declined — re-upload it before publishing.');
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- packages/features/src/listing/validation.test.ts`
Expected: PASS — all tests in the file, including the 4 new ones and the pre-existing "passes a complete listing" test (which calls `buildPublishChecklist(complete, '0821234567')` with no third argument, so `ownershipStatus` is `undefined` and falls into the `not_submitted` branch — this is expected and correct: an existing complete-but-unverified listing should now also be blocked).

- [ ] **Step 5: Fix the now-failing "passes a complete listing" test**

The existing test `'passes a complete listing with a phone on file'` now fails because the ownership blocker always fires when the third argument is omitted. Update that one call site in `packages/features/src/listing/validation.test.ts` to pass `'verified'`:

```ts
  it('passes a complete listing with a phone on file', () => {
    const r = buildPublishChecklist(complete, '0821234567', 'verified');
    expect(r.blockers).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });
```

Run: `npm run test -- packages/features/src/listing/validation.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 6: Commit**

```bash
git add packages/features/src/listing/validation.ts packages/features/src/listing/validation.test.ts
git commit -m "feat: block publishing until the title deed is verified"
```

---

## Task 3: Title-deed upload UI in `ReviewStep`

**Files:**
- Modify: `packages/features/src/listing/components/ReviewStep.tsx`
- Modify: `packages/features/src/listing/index.ts` (export the new `FileUploadZone`-based prop type if needed)

- [ ] **Step 1: Add the ownership prop and section**

In `packages/features/src/listing/components/ReviewStep.tsx`, add the import (near the existing imports):

```tsx
import { FileUploadZone } from '../../kyc/components/FileUploadZone';
import type { OwnershipStatus } from '../validation';
```

Extend `ReviewStepProps` (replace the existing interface):

```tsx
interface ReviewStepProps {
  formData: ListingFormData | SaleListingFormData;
  isSale?: boolean;
  onEdit?: (step: number) => void;
  checklist?: PublishChecklist;
  declaration?: { checked: boolean; onChange: (v: boolean) => void };
  contact?: { phone: string | null; saving: boolean; onSavePhone: (phone: string) => void };
  regenerate?: { onRegenerate: () => void; generating: boolean };
  ownership?: {
    status: OwnershipStatus;
    declineReason?: string | null;
    uploading: boolean;
    uploadError?: string | null;
    onUpload: (file: File) => void;
  };
}
```

Add `ownership` to the destructured props on the component signature:

```tsx
export default function ReviewStep({ formData, isSale, onEdit, checklist, declaration, contact, regenerate, ownership }: ReviewStepProps) {
```

Add a new Card section (insert it directly before the existing `{declaration && (...)}` block, so it appears right above the final declaration checkbox):

```tsx
      {ownership && !isSale && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Proof of ownership
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ownership.status === 'verified' ? (
              <p className="flex items-center gap-2 text-sm text-success">
                <ShieldCheck className="h-4 w-4" /> Title deed verified.
              </p>
            ) : (
              <>
                {ownership.status === 'submitted' && (
                  <p className="text-sm text-muted-foreground">
                    Your title deed is under review. We'll notify you once it's verified.
                  </p>
                )}
                {ownership.status === 'declined' && (
                  <p className="text-sm text-destructive">
                    Declined: {ownership.declineReason || 'Please re-upload a clearer copy of your title deed.'}
                  </p>
                )}
                <FileUploadZone
                  label="Title deed"
                  description="Upload a photo or PDF of your title deed so we can verify you own this property."
                  accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }}
                  maxSize={10 * 1024 * 1024}
                  isUploading={ownership.uploading}
                  uploadError={ownership.uploadError ?? undefined}
                  onFileSelect={ownership.onUpload}
                  onFileRemove={() => {}}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build --workspace=@mzanzihomes/features` (or the repo's equivalent typecheck command for the `packages/features` workspace — check `package.json` scripts if the exact name differs).
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add packages/features/src/listing/components/ReviewStep.tsx
git commit -m "feat: add title-deed upload section to the listing review step"
```

---

## Task 4: Wire the upload handler and error prefixes in `ListProperty.tsx`

**Files:**
- Modify: `apps/landlord/src/pages/ListProperty.tsx`

- [ ] **Step 1: Add upload state and handler**

Near the other `useState` declarations in `ListProperty.tsx` (alongside `publishStage`, `showPaywall`, etc.), add:

```tsx
  const [ownershipUploading, setOwnershipUploading] = useState(false);
  const [ownershipUploadError, setOwnershipUploadError] = useState<string | null>(null);

  const uploadTitleDeed = async (file: File) => {
    if (!draft.draftId) {
      setOwnershipUploadError('Save your progress first by filling in the earlier steps.');
      return;
    }
    setOwnershipUploading(true);
    setOwnershipUploadError(null);
    try {
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `${draft.draftId}/deed.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('title-deeds').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase
        .from('properties')
        .update({ title_deed_path: path, ownership_status: 'submitted', ownership_decline_reason: null })
        .eq('id', draft.draftId);
      if (updateErr) throw updateErr;
      toast({ title: 'Title deed submitted', description: "We'll review it and notify you once it's verified." });
    } catch (err: any) {
      setOwnershipUploadError(err?.message || 'Could not upload the title deed. Please try again.');
    } finally {
      setOwnershipUploading(false);
    }
  };
```

- [ ] **Step 2: Pass the new data into `buildPublishChecklist` and `ReviewStep`**

Find the existing call to `buildPublishChecklist` (used to compute `checklist` before rendering `ReviewStep`) and add the third argument — the property's current `ownership_status`. If the wizard doesn't currently keep `ownership_status`/`title_deed_path`/`ownership_decline_reason` in its loaded property/draft state, add them to whatever query already loads the existing property for edit (the hook `useExistingProperty` imported at the top of this file) so they're available as `existingProperty?.ownership_status` etc.

Update the checklist call:

```tsx
const checklist = buildPublishChecklist(formData, profile?.phone, existingProperty?.ownership_status ?? 'not_submitted');
```

Update the `ReviewStep` render (case 6 in `renderStepContent`):

```tsx
      case 6:
        return (
          <ReviewStep
            formData={formData}
            onEdit={editFromReview}
            checklist={checklist}
            declaration={{ checked: declarationChecked, onChange: setDeclarationChecked }}
            contact={{ phone: profile?.phone ?? null, saving: savingPhone, onSavePhone: savePhone }}
            regenerate={{ onRegenerate: regenerateDescription, generating: regenerating }}
            ownership={{
              status: existingProperty?.ownership_status ?? 'not_submitted',
              declineReason: existingProperty?.ownership_decline_reason,
              uploading: ownershipUploading,
              uploadError: ownershipUploadError,
              onUpload: uploadTitleDeed,
            }}
          />
        );
```

- [ ] **Step 3: Handle the two new error prefixes in `onSubmit`**

In the existing `onSubmit` function, find the block that checks `publishErr.message?.includes('PUBLISH_PAYWALL')` (around where `setShowPaywall(true)` is called) and add two new branches **before** it:

```tsx
      setPublishStage('publishing');
      const { error: publishErr } = await supabase.from('properties').update({ is_listed: true }).eq('id', id);
      if (publishErr) {
        if (publishErr.message?.includes('OWNERSHIP_NOT_VERIFIED')) {
          toast({
            variant: 'destructive',
            title: 'Title deed not verified yet',
            description: 'Upload your title deed in the review step, or wait for review to finish, before publishing.',
          });
          return;
        }
        if (publishErr.message?.includes('IDENTITY_NOT_VERIFIED')) {
          toast({
            variant: 'destructive',
            title: 'Identity verification required',
            description: 'Complete ID verification before publishing your first listing.',
          });
          navigate('/verify-id');
          return;
        }
        if (publishErr.message?.includes('PUBLISH_PAYWALL')) {
          setPaywallPropertyId(id);
          setShowPaywall(true);
          return; // draft saved; success dialog is skipped
        }
        throw publishErr;
      }
```

- [ ] **Step 4: Verify it compiles**

Run the landlord app's typecheck/build command (check `apps/landlord/package.json` scripts — typically `npm run build --workspace=landlord` or similar in this monorepo).
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add apps/landlord/src/pages/ListProperty.tsx
git commit -m "feat: wire title-deed upload and ownership/identity publish errors"
```

---

## Task 5: Edge function `admin-approve-property-ownership`

**Files:**
- Create: `supabase/functions/admin-approve-property-ownership/index.ts`

- [ ] **Step 1: Write the function** (copies `kyc-admin-approve`'s exact auth/structure pattern)

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  property_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    if (adminCheckError || !isAdmin) {
      throw new Error('Admin access required');
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { property_id }: ApproveRequest = await req.json();
    if (!property_id) {
      throw new Error('property_id is required');
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, ownership_status, title_deed_path')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }
    if (property.ownership_status !== 'submitted') {
      throw new Error('Property is not in submitted status');
    }
    if (!property.title_deed_path) {
      throw new Error('No title deed on file for this property');
    }

    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        ownership_status: 'verified',
        ownership_verified_at: new Date().toISOString(),
        ownership_reviewed_by: user.id,
        ownership_decline_reason: null,
      })
      .eq('id', property_id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'property_ownership_verified',
      _properties: { property_id, reviewed_by: user.id },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Ownership verified', property_id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
```

- [ ] **Step 2: Deploy it**

Use the Supabase MCP `deploy_edge_function` tool with `project_id: rsfrvjaqxhoqavvscvwf`, `name: admin-approve-property-ownership`, `entrypoint_path: index.ts`, `verify_jwt: true`, and the file content from Step 1.

- [ ] **Step 3: Verify it rejects a non-admin caller**

Call it with a real non-admin user's JWT (e.g. via `curl -X POST https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/admin-approve-property-ownership -H "Authorization: Bearer <non-admin JWT>" -H "Content-Type: application/json" -d '{"property_id":"<any-uuid>"}'`).
Expected: `{"error":"Admin access required"}` with a non-200 status.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-approve-property-ownership/index.ts
git commit -m "feat: add admin-approve-property-ownership edge function"
```

---

## Task 6: Edge function `admin-decline-property-ownership`

**Files:**
- Create: `supabase/functions/admin-decline-property-ownership/index.ts`

- [ ] **Step 1: Write the function** (copies `kyc-admin-decline`'s exact pattern)

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeclineRequest {
  property_id: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    if (adminCheckError || !isAdmin) {
      throw new Error('Admin access required');
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { property_id, reason }: DeclineRequest = await req.json();
    if (!property_id || !reason?.trim()) {
      throw new Error('property_id and reason are required');
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, ownership_status')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }
    if (property.ownership_status !== 'submitted') {
      throw new Error('Property is not in submitted status');
    }

    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        ownership_status: 'declined',
        ownership_reviewed_by: user.id,
        ownership_decline_reason: reason.trim(),
      })
      .eq('id', property_id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'property_ownership_declined',
      _properties: { property_id, reviewed_by: user.id, reason: reason.trim() },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Ownership declined', property_id, reason: reason.trim() }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
```

- [ ] **Step 2: Deploy it**

Use the Supabase MCP `deploy_edge_function` tool with `project_id: rsfrvjaqxhoqavvscvwf`, `name: admin-decline-property-ownership`, `entrypoint_path: index.ts`, `verify_jwt: true`, and the file content from Step 1.

- [ ] **Step 3: Verify it requires a reason**

Call it as an admin with an empty reason: `curl -X POST https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/admin-decline-property-ownership -H "Authorization: Bearer <admin JWT>" -H "Content-Type: application/json" -d '{"property_id":"<any-uuid>","reason":""}'`.
Expected: `{"error":"property_id and reason are required"}`.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/admin-decline-property-ownership/index.ts
git commit -m "feat: add admin-decline-property-ownership edge function"
```

---

## Task 7: Implement the admin review UI in `DocumentReview.tsx`

**Files:**
- Modify: `apps/web/src/pages/admin/DocumentReview.tsx`

- [ ] **Step 1: Replace the stub with a real implementation**

Replace the entire contents of `apps/web/src/pages/admin/DocumentReview.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@mzanzihomes/ui/components/dialog';
import { Label } from '@mzanzihomes/ui/components/label';
import { Eye, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';

interface PendingDeed {
  id: string;
  title: string;
  location: string;
  landlord_id: string;
  title_deed_path: string;
  landlord_name: string | null;
}

export default function DocumentReview() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<PendingDeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [declineReason, setDeclineReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, location, landlord_id, title_deed_path, profiles!properties_landlord_id_fkey(display_name)')
      .eq('ownership_status', 'submitted')
      .order('updated_at', { ascending: true });
    if (error) {
      toast({ variant: 'destructive', title: 'Could not load pending title deeds', description: error.message });
      setLoading(false);
      return;
    }
    const rows: PendingDeed[] = (data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      location: r.location,
      landlord_id: r.landlord_id,
      title_deed_path: r.title_deed_path,
      landlord_name: r.profiles?.display_name ?? null,
    }));
    setDocuments(rows);
    setLoading(false);

    const urls: Record<string, string> = {};
    for (const row of rows) {
      const { data: signed } = await supabase.storage.from('title-deeds').createSignedUrl(row.title_deed_path, 60 * 10);
      if (signed?.signedUrl) urls[row.id] = signed.signedUrl;
    }
    setSignedUrls(urls);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (propertyId: string) => {
    setBusyId(propertyId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-approve-property-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ property_id: propertyId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Approval failed');
      toast({ title: 'Ownership verified' });
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not approve', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (propertyId: string) => {
    if (!declineReason.trim()) {
      toast({ variant: 'destructive', title: 'A reason is required' });
      return;
    }
    setBusyId(propertyId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-decline-property-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({ property_id: propertyId, reason: declineReason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Decline failed');
      toast({ title: 'Ownership declined' });
      setDeclineReason('');
      await load();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not decline', description: err.message });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
          <p className="text-muted-foreground">Review title deeds submitted for ownership verification</p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Review</h1>
        <p className="text-muted-foreground">Review title deeds submitted for ownership verification</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            Nothing pending review.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{doc.title}</CardTitle>
                    <CardDescription>{doc.location} — {doc.landlord_name || 'Unknown landlord'}</CardDescription>
                  </div>
                  <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                {signedUrls[doc.id] ? (
                  <a href={signedUrls[doc.id]} target="_blank" rel="noreferrer">
                    <Button type="button" variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" /> View title deed
                    </Button>
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Loading document…
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm" disabled={busyId === doc.id}>
                        <XCircle className="h-4 w-4 mr-2" /> Decline
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Decline title deed</DialogTitle>
                        <DialogDescription>Tell the landlord what to fix before re-uploading.</DialogDescription>
                      </DialogHeader>
                      <Label htmlFor="decline-reason">Reason</Label>
                      <Textarea id="decline-reason" value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
                      <DialogFooter>
                        <Button type="button" variant="destructive" onClick={() => decline(doc.id)} disabled={busyId === doc.id}>
                          Confirm decline
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button type="button" size="sm" onClick={() => approve(doc.id)} disabled={busyId === doc.id}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Note for the implementing engineer:** the `profiles!properties_landlord_id_fkey` embed syntax assumes a foreign key of that exact name exists from `properties.landlord_id` to `profiles.user_id`. Run `select conname from pg_constraint where conrelid = 'public.properties'::regclass and confrelid = 'public.profiles'::regclass;` first to confirm the real constraint name, and substitute it if different — Supabase's PostgREST embed syntax requires the exact FK name.

- [ ] **Step 2: Verify it compiles**

Run the web app's typecheck/build command (check `apps/web/package.json` scripts).
Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/admin/DocumentReview.tsx
git commit -m "feat: implement admin title-deed review UI"
```

---

## Task 8: End-to-end verification against the live project

**Files:** none (verification only)

- [ ] **Step 1: Confirm the trigger blocks correctly for a real property**

Pick a real `property_id` with `ownership_status = 'not_submitted'` (or create a disposable test property) and attempt `update properties set is_listed = true where id = '<id>'` directly via SQL as a sanity check of the trigger logic (not as the app would call it, which goes through RLS as the landlord).
Expected: raises `OWNERSHIP_NOT_VERIFIED`.

- [ ] **Step 2: Click through the real flow**

As a test landlord: open `/list-property`, progress to the review step, upload a title deed, confirm the "under review" message appears and the Publish button's checklist blocks it. As the admin: open `/admin/documents`, confirm the property appears, view the signed URL, approve it. Back as the landlord: confirm the notification arrived and the checklist no longer blocks on ownership (it will still block on identity/KYC and payment if those aren't done — confirm each in turn, same as the test matrix in the design spec).

- [ ] **Step 3: Clean up any disposable test data created in Step 1/2**

Delete any test property/title-deed file created solely for this verification pass.

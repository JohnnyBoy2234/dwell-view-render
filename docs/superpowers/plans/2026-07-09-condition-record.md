# Condition Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate Inventory and Inspection features with a single tenancy-anchored **Condition Record**: location-tagged photos from both parties, locked by mutual attestation. Spec: ADR `docs/adr/0004-photos-only-condition-record.md`; glossary: `CONTEXT.md`.

**Architecture:** New vertical slice `packages/features/src/condition-record/` (hooks are the data layer per ADR-0003), shared types/helpers in `packages/common`, two Postgres tables + one private storage bucket with DB-enforced lifecycle rules (triggers/RPCs), pg_cron jobs for move-out auto-create and weekly reminders, move-in auto-create hooked into the existing `sign-lease-contract` edge function. Old inventory/inspection tables and UI are dropped clean (no data migration).

**Tech Stack:** React 18 + TS, Supabase (Postgres RLS, Storage, Realtime, pg_cron, Deno edge functions), vitest, turbo monorepo.

## Global Constraints

- Dependency lattice (lint-enforced, ADR-0003): `common` depends on nothing; `ui`, `supabase` → `common`; `features` → `ui`+`supabase`+`common`; `apps` → all. Only slice hooks may call `.from`/`.rpc`/`.functions.invoke`/`.storage`.
- Vocabulary (CONTEXT.md): **Condition Record**, **Attestation**. Never "inspection" or "Condition Report" (that's the Annexure A lease document — untouched by this plan). "Inventory" is a separate KEPT feature (furnished-property stock list — ADR-0004 as amended 2026-07-10), not a synonym for Condition Record.
- Domain rules (ADR-0004): one record per tenancy per event (`move_in`,`move_out`); any photo add/delete clears **all** attestations; both attested = permanently locked (no photo changes, no note edits, no unlock); each party deletes only their own photos; both parties see all photos immediately.
- Canonical attestation text (verbatim, single source = DB column default):
  `Both parties confirm that the photographs in this record fairly represent the condition of the property as at the date of their agreement.`
- No new npm dependencies.
- Migration timestamps: use the `202607091000NN_*` prefixes given below so ordering is deterministic.
- Commits end with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: Domain types + pure helpers in `packages/common`

**Files:**
- Create: `packages/common/src/types/conditionRecord.ts`
- Create: `packages/common/src/types/conditionRecord.test.ts`
- Modify: `packages/common/src/index.ts` (add one export line; do NOT remove the inventory/inspection exports yet — old code still imports them until Task 8)

**Interfaces:**
- Produces (later tasks rely on these exact names): types `ConditionRecord`, `ConditionPhoto`, `ConditionEventType`, `ConditionParty`, `ConditionRecordState`; constants `LOCATION_TAGS`, `ATTESTATION_TEXT`; functions `conditionRecordState(record): ConditionRecordState`, `groupPhotosByLocation(photos): { location: string; photos: ConditionPhoto[] }[]`.

- [x] **Step 1: Write the failing test**

`packages/common/src/types/conditionRecord.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  conditionRecordState,
  groupPhotosByLocation,
  LOCATION_TAGS,
  type ConditionRecord,
  type ConditionPhoto,
} from './conditionRecord';

const base: ConditionRecord = {
  id: 'r1',
  tenancy_id: 't1',
  event_type: 'move_in',
  attestation_text: 'text',
  tenant_attested_at: null,
  landlord_attested_at: null,
  tenant_notes: null,
  landlord_notes: null,
  locked: false,
  created_at: '2026-07-09T00:00:00Z',
  updated_at: '2026-07-09T00:00:00Z',
};

const photo = (id: string, location_tag: string, created_at: string): ConditionPhoto => ({
  id,
  record_id: 'r1',
  uploaded_by: 'u1',
  location_tag,
  caption: null,
  storage_path: `r1/${id}.jpg`,
  created_at,
});

describe('conditionRecordState', () => {
  it('is open when nobody has attested', () => {
    expect(conditionRecordState(base)).toBe('open');
  });
  it('awaits the landlord when only the tenant attested', () => {
    expect(conditionRecordState({ ...base, tenant_attested_at: '2026-07-09T10:00:00Z' })).toBe('awaiting_landlord');
  });
  it('awaits the tenant when only the landlord attested', () => {
    expect(conditionRecordState({ ...base, landlord_attested_at: '2026-07-09T10:00:00Z' })).toBe('awaiting_tenant');
  });
  it('is locked when both attested', () => {
    expect(
      conditionRecordState({
        ...base,
        tenant_attested_at: '2026-07-09T10:00:00Z',
        landlord_attested_at: '2026-07-09T11:00:00Z',
        locked: true,
      }),
    ).toBe('locked');
  });
});

describe('groupPhotosByLocation', () => {
  it('groups photos by tag in LOCATION_TAGS order, unknown tags last alphabetically', () => {
    const groups = groupPhotosByLocation([
      photo('p1', 'Garage', '2026-07-09T10:00:00Z'),
      photo('p2', 'Kitchen', '2026-07-09T10:01:00Z'),
      photo('p3', 'Attic', '2026-07-09T10:02:00Z'),
      photo('p4', 'Kitchen', '2026-07-09T10:03:00Z'),
    ]);
    expect(groups.map((g) => g.location)).toEqual(['Kitchen', 'Garage', 'Attic']);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['p2', 'p4']);
  });
  it('orders photos within a group by created_at ascending', () => {
    const groups = groupPhotosByLocation([
      photo('later', 'Kitchen', '2026-07-09T12:00:00Z'),
      photo('earlier', 'Kitchen', '2026-07-09T09:00:00Z'),
    ]);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['earlier', 'later']);
  });
  it('returns empty array for no photos', () => {
    expect(groupPhotosByLocation([])).toEqual([]);
  });
  it('exposes a fixed tag list including numbered bedrooms', () => {
    expect(LOCATION_TAGS).toContain('Bedroom 2');
    expect(LOCATION_TAGS).toContain('Other');
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/conditionRecord.test.ts` from `packages/common/`
Expected: FAIL — cannot resolve `./conditionRecord`

- [x] **Step 3: Write the implementation**

`packages/common/src/types/conditionRecord.ts`:

```ts
export type ConditionEventType = 'move_in' | 'move_out';
export type ConditionParty = 'tenant' | 'landlord';
export type ConditionRecordState = 'open' | 'awaiting_tenant' | 'awaiting_landlord' | 'locked';

export interface ConditionRecord {
  id: string;
  tenancy_id: string;
  event_type: ConditionEventType;
  attestation_text: string;
  tenant_attested_at: string | null;
  landlord_attested_at: string | null;
  tenant_notes: string | null;
  landlord_notes: string | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConditionPhoto {
  id: string;
  record_id: string;
  uploaded_by: string;
  location_tag: string;
  caption: string | null;
  storage_path: string;
  created_at: string;
}

export const LOCATION_TAGS = [
  'Kitchen',
  'Living Room',
  'Dining Room',
  'Bedroom 1',
  'Bedroom 2',
  'Bedroom 3',
  'Bedroom 4',
  'Bathroom 1',
  'Bathroom 2',
  'Garage',
  'Exterior',
  'Garden',
  'Other',
] as const;

// Must match the DB column default in the condition_records migration verbatim.
export const ATTESTATION_TEXT =
  'Both parties confirm that the photographs in this record fairly represent the condition of the property as at the date of their agreement.';

export function conditionRecordState(r: ConditionRecord): ConditionRecordState {
  if (r.tenant_attested_at && r.landlord_attested_at) return 'locked';
  if (r.tenant_attested_at) return 'awaiting_landlord';
  if (r.landlord_attested_at) return 'awaiting_tenant';
  return 'open';
}

export function groupPhotosByLocation(
  photos: ConditionPhoto[],
): { location: string; photos: ConditionPhoto[] }[] {
  const byTag = new Map<string, ConditionPhoto[]>();
  for (const p of photos) {
    const list = byTag.get(p.location_tag) ?? [];
    list.push(p);
    byTag.set(p.location_tag, list);
  }
  const known = LOCATION_TAGS.filter((t) => byTag.has(t)) as string[];
  const unknown = [...byTag.keys()]
    .filter((t) => !(LOCATION_TAGS as readonly string[]).includes(t))
    .sort();
  return [...known, ...unknown].map((location) => ({
    location,
    photos: [...byTag.get(location)!].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}
```

Add to `packages/common/src/index.ts` (next to the existing type exports):

```ts
export * from './types/conditionRecord';
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/conditionRecord.test.ts` from `packages/common/`
Expected: PASS (7 tests)

- [x] **Step 5: Commit**

```bash
git add packages/common/src/types/conditionRecord.ts packages/common/src/types/conditionRecord.test.ts packages/common/src/index.ts
git commit -m "feat(common): condition record types, tags, and state helpers"
```

---

### Task 2: Database migration — tables, RLS, triggers, RPCs, storage bucket

**Files:**
- Create: `supabase/migrations/20260709100000_condition_records.sql`
- Create: `supabase/tests/condition_records.test.sql`

**Interfaces:**
- Produces: tables `public.condition_records` (with generated `locked` column), `public.condition_photos`; RPCs `attest_condition_record(p_record_id uuid)`, `set_condition_notes(p_record_id uuid, p_notes text)`; helper `is_condition_record_party(p_record_id uuid)`; private storage bucket `condition-photos` with paths `{record_id}/{filename}`.
- Consumes: existing `public.tenancies`, `update_updated_at_column()` trigger function, `supabase_realtime` publication.

- [x] **Step 1: Write the migration**

`supabase/migrations/20260709100000_condition_records.sql`:

```sql
-- Condition Record: photographic record of property condition at move-in/move-out,
-- captured by both tenancy parties, locked by mutual attestation. See ADR-0004.

CREATE TABLE public.condition_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenancy_id UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('move_in', 'move_out')),
    -- Stored verbatim so old records keep the words actually agreed if wording changes.
    attestation_text TEXT NOT NULL DEFAULT 'Both parties confirm that the photographs in this record fairly represent the condition of the property as at the date of their agreement.',
    tenant_attested_at TIMESTAMPTZ,
    landlord_attested_at TIMESTAMPTZ,
    tenant_notes TEXT,
    landlord_notes TEXT,
    locked BOOLEAN GENERATED ALWAYS AS (tenant_attested_at IS NOT NULL AND landlord_attested_at IS NOT NULL) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenancy_id, event_type)
);

CREATE TABLE public.condition_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    location_tag TEXT NOT NULL,
    caption TEXT,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_condition_records_tenancy_id ON public.condition_records(tenancy_id);
CREATE INDEX idx_condition_photos_record_id ON public.condition_photos(record_id);

CREATE TRIGGER update_condition_records_updated_at
    BEFORE UPDATE ON public.condition_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Both tenancy parties see the record; used by table and storage policies.
CREATE OR REPLACE FUNCTION public.is_condition_record_party(p_record_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM condition_records r
        JOIN tenancies t ON t.id = r.tenancy_id
        WHERE r.id = p_record_id
          AND auth.uid() IN (t.tenant_id, t.landlord_id)
    );
$$;

ALTER TABLE public.condition_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view their condition records"
ON public.condition_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id = tenancy_id AND auth.uid() IN (t.tenant_id, t.landlord_id)
    )
);

CREATE POLICY "Parties can create condition records for their tenancy"
ON public.condition_records FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.tenancies t
        WHERE t.id = tenancy_id AND auth.uid() IN (t.tenant_id, t.landlord_id)
    )
);
-- No UPDATE/DELETE policies on condition_records: attestation and notes go through
-- the RPCs below; records are never deleted by clients.

CREATE POLICY "Parties can view condition photos"
ON public.condition_photos FOR SELECT
USING (public.is_condition_record_party(record_id));

CREATE POLICY "Parties can add photos to open condition records"
ON public.condition_photos FOR INSERT
WITH CHECK (
    uploaded_by = auth.uid()
    AND public.is_condition_record_party(record_id)
    AND NOT EXISTS (SELECT 1 FROM public.condition_records r WHERE r.id = record_id AND r.locked)
);

CREATE POLICY "Uploaders can delete their own photos while record is open"
ON public.condition_photos FOR DELETE
USING (
    uploaded_by = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM public.condition_records r WHERE r.id = record_id AND r.locked)
);
-- No UPDATE policy on condition_photos: fix a wrong tag by delete + re-upload.

-- ADR-0004: any photo change on an open record clears all attestations (both parties
-- must re-agree); changes to a locked record are refused outright.
CREATE OR REPLACE FUNCTION public.condition_photo_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    rid UUID := COALESCE(NEW.record_id, OLD.record_id);
BEGIN
    IF EXISTS (SELECT 1 FROM condition_records WHERE id = rid AND locked) THEN
        RAISE EXCEPTION 'Condition record % is locked', rid;
    END IF;
    UPDATE condition_records
    SET tenant_attested_at = NULL, landlord_attested_at = NULL
    WHERE id = rid;
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER condition_photo_change
    BEFORE INSERT OR DELETE ON public.condition_photos
    FOR EACH ROW EXECUTE FUNCTION public.condition_photo_change();

-- Sets the calling party's attestation timestamp. Idempotent; no-op once locked.
CREATE OR REPLACE FUNCTION public.attest_condition_record(p_record_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_landlord UUID;
    v_locked BOOLEAN;
BEGIN
    SELECT t.tenant_id, t.landlord_id, r.locked
    INTO v_tenant, v_landlord, v_locked
    FROM condition_records r
    JOIN tenancies t ON t.id = r.tenancy_id
    WHERE r.id = p_record_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Condition record not found';
    END IF;
    IF v_locked THEN
        RETURN;
    END IF;
    IF auth.uid() = v_tenant THEN
        UPDATE condition_records SET tenant_attested_at = now() WHERE id = p_record_id;
    ELSIF auth.uid() = v_landlord THEN
        UPDATE condition_records SET landlord_attested_at = now() WHERE id = p_record_id;
    ELSE
        RAISE EXCEPTION 'Not a party to this condition record';
    END IF;
END;
$$;

-- Sets the calling party's free-text notes. Refused once locked.
CREATE OR REPLACE FUNCTION public.set_condition_notes(p_record_id UUID, p_notes TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_tenant UUID;
    v_landlord UUID;
    v_locked BOOLEAN;
BEGIN
    SELECT t.tenant_id, t.landlord_id, r.locked
    INTO v_tenant, v_landlord, v_locked
    FROM condition_records r
    JOIN tenancies t ON t.id = r.tenancy_id
    WHERE r.id = p_record_id
    FOR UPDATE OF r;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Condition record not found';
    END IF;
    IF v_locked THEN
        RAISE EXCEPTION 'Condition record is locked';
    END IF;
    IF auth.uid() = v_tenant THEN
        UPDATE condition_records SET tenant_notes = p_notes WHERE id = p_record_id;
    ELSIF auth.uid() = v_landlord THEN
        UPDATE condition_records SET landlord_notes = p_notes WHERE id = p_record_id;
    ELSE
        RAISE EXCEPTION 'Not a party to this condition record';
    END IF;
END;
$$;

-- Live updates so both parties watch the shared gallery fill in real time.
ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.condition_photos;

-- Private bucket; object paths are {record_id}/{filename}.
INSERT INTO storage.buckets (id, name, public)
VALUES ('condition-photos', 'condition-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Parties can view condition photo files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'condition-photos'
    AND public.is_condition_record_party(((string_to_array(name, '/'))[1])::uuid)
);

CREATE POLICY "Parties can upload condition photo files to open records"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'condition-photos'
    AND public.is_condition_record_party(((string_to_array(name, '/'))[1])::uuid)
    AND NOT EXISTS (
        SELECT 1 FROM public.condition_records r
        WHERE r.id = ((string_to_array(name, '/'))[1])::uuid AND r.locked
    )
);

CREATE POLICY "Uploaders can delete their own condition photo files while open"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'condition-photos'
    AND owner = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM public.condition_records r
        WHERE r.id = ((string_to_array(name, '/'))[1])::uuid AND r.locked
    )
);
```

- [x] **Step 2: Write the SQL smoke test**

`supabase/tests/condition_records.test.sql` (runs as postgres superuser against the local stack; uses `set_config('request.jwt.claims', ...)` so `auth.uid()` resolves inside the SECURITY DEFINER RPCs; everything in one rolled-back transaction):

```sql
-- Smoke test for condition record lifecycle rules. Run against local supabase:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/condition_records.test.sql
BEGIN;

DO $$
DECLARE
    v_tenant UUID := gen_random_uuid();
    v_landlord UUID := gen_random_uuid();
    v_tenancy UUID;
    v_record UUID;
    v_photo UUID;
    r RECORD;
    v_errored BOOLEAN := false;
BEGIN
    INSERT INTO auth.users (id, email) VALUES (v_tenant, 'crt-tenant@test.local');
    INSERT INTO auth.users (id, email) VALUES (v_landlord, 'crt-landlord@test.local');

    -- tenancies has no FK on property_id, so a random uuid is fine for the test
    INSERT INTO public.tenancies (property_id, tenant_id, landlord_id, start_date, end_date, monthly_rent, status)
    VALUES (gen_random_uuid(), v_tenant, v_landlord, current_date, current_date + 365, 1000, 'active')
    RETURNING id INTO v_tenancy;

    INSERT INTO public.condition_records (tenancy_id, event_type)
    VALUES (v_tenancy, 'move_in')
    RETURNING id INTO v_record;

    -- 1. duplicate event for same tenancy is rejected
    BEGIN
        INSERT INTO public.condition_records (tenancy_id, event_type) VALUES (v_tenancy, 'move_in');
        RAISE EXCEPTION 'TEST FAIL: duplicate (tenancy, event) accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    -- 2. tenant attests via RPC
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NULL OR r.locked THEN
        RAISE EXCEPTION 'TEST FAIL: tenant attestation not recorded correctly';
    END IF;

    -- 3. photo insert clears existing attestations
    INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
    VALUES (v_record, v_landlord, 'Kitchen', v_record || '/a.jpg')
    RETURNING id INTO v_photo;
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAIL: photo insert did not clear attestations';
    END IF;

    -- 4. both attest -> locked
    PERFORM public.attest_condition_record(v_record);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF NOT r.locked THEN
        RAISE EXCEPTION 'TEST FAIL: record not locked after both attestations';
    END IF;

    -- 5. photo changes on a locked record are refused
    BEGIN
        DELETE FROM public.condition_photos WHERE id = v_photo;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: photo delete allowed on locked record';
    END IF;

    -- 6. notes on a locked record are refused
    BEGIN
        PERFORM public.set_condition_notes(v_record, 'too late');
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: notes edit allowed on locked record';
    END IF;

    -- 7. a stranger cannot attest
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    BEGIN
        PERFORM public.attest_condition_record(v_record);
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: non-party allowed to attest';
    END IF;

    RAISE NOTICE 'condition_records smoke test: ALL PASS';
END $$;

ROLLBACK;
```

- [x] **Step 3: Apply migrations and run the smoke test**

```bash
npm run supabase -- db reset   # applies all migrations to the local stack (starts it if needed: npm run supabase -- start)
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/condition_records.test.sql
```

Expected: `db reset` completes without error; psql prints `NOTICE:  condition_records smoke test: ALL PASS` and exits 0. If `auth.users` insert fails on a NOT NULL column locally, add the minimum columns the error names (commonly `instance_id, aud, role`) to the two insert statements.

- [x] **Step 4: Commit**

```bash
git add supabase/migrations/20260709100000_condition_records.sql supabase/tests/condition_records.test.sql
git commit -m "feat(db): condition_records + condition_photos with attestation lifecycle"
```

---

### Task 3: Scheduled jobs — move-out auto-create + weekly attestation reminders

**Files:**
- Create: `supabase/migrations/20260709101000_condition_record_jobs.sql`

**Interfaces:**
- Consumes: `public.condition_records` (Task 2), `public.create_notification(_user_id, _message, _link_url, _type, _metadata)` (existing SECURITY DEFINER helper), pg_cron (already enabled by `20260706110000_schedule_billing_cycle.sql`).
- Produces: cron jobs `condition-record-move-out-daily`, `condition-record-reminders-weekly`. Notification `type` value used everywhere: `condition_record`.

- [x] **Step 1: Write the migration**

`supabase/migrations/20260709101000_condition_record_jobs.sql`:

```sql
-- Pure-SQL scheduled jobs (no edge function needed — unlike billing-cycle, there is
-- no external side effect here, just inserts).

-- Daily 05:10 UTC: auto-create the move-out condition record 14 days before tenancy
-- end and notify both parties. ON CONFLICT makes it idempotent; the unique constraint
-- also absorbs races with manual creation (early terminations are handled by the
-- manual "start move-out record" action in the UI).
SELECT cron.schedule(
  'condition-record-move-out-daily',
  '10 5 * * *',
  $$
  WITH created AS (
    INSERT INTO public.condition_records (tenancy_id, event_type)
    SELECT t.id, 'move_out'
    FROM public.tenancies t
    WHERE t.status = 'active'
      AND t.end_date <= (current_date + 14)
    ON CONFLICT (tenancy_id, event_type) DO NOTHING
    RETURNING tenancy_id
  )
  SELECT
    public.create_notification(
      t.tenant_id,
      'Your move-out condition record has been started. Photograph the property before handover.',
      '/tenant-dashboard/condition-records',
      'condition_record',
      jsonb_build_object('tenancy_id', t.id)
    ),
    public.create_notification(
      t.landlord_id,
      'A move-out condition record has been started for your property. Photograph it before handover.',
      '/enhancedlandlorddashboard/condition-records',
      'condition_record',
      jsonb_build_object('tenancy_id', t.id)
    )
  FROM created c
  JOIN public.tenancies t ON t.id = c.tenancy_id;
  $$
);

-- Weekly Monday 06:00 UTC: nag each party who has not yet attested an open record.
-- No reminder-tracking table: the weekly cadence IS the throttle.
SELECT cron.schedule(
  'condition-record-reminders-weekly',
  '0 6 * * 1',
  $$
  SELECT public.create_notification(
    u.user_id,
    'Reminder: the ' || replace(r.event_type, '_', '-') || ' condition record is awaiting your attestation.',
    u.link_url,
    'condition_record',
    jsonb_build_object('record_id', r.id)
  )
  FROM public.condition_records r
  JOIN public.tenancies t ON t.id = r.tenancy_id
  CROSS JOIN LATERAL (
    SELECT t.tenant_id AS user_id, '/tenant-dashboard/condition-records' AS link_url
    WHERE r.tenant_attested_at IS NULL
    UNION ALL
    SELECT t.landlord_id, '/enhancedlandlorddashboard/condition-records'
    WHERE r.landlord_attested_at IS NULL
  ) u
  WHERE NOT r.locked;
  $$
);
```

- [x] **Step 2: Apply and verify the jobs exist and their SQL runs**

```bash
npm run supabase -- db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c \
  "SELECT jobname FROM cron.job WHERE jobname LIKE 'condition-record-%' ORDER BY jobname;"
```

Expected: two rows — `condition-record-move-out-daily`, `condition-record-reminders-weekly`.

Then execute each job's body once by hand to prove the SQL is valid (empty tables → 0 rows, no error):

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -c \
  "DO \$\$ DECLARE cmd TEXT; BEGIN FOR cmd IN SELECT command FROM cron.job WHERE jobname LIKE 'condition-record-%' LOOP EXECUTE cmd; END LOOP; END \$\$;"
```

Expected: completes without error.

- [x] **Step 3: Commit**

```bash
git add supabase/migrations/20260709101000_condition_record_jobs.sql
git commit -m "feat(db): cron jobs for move-out condition records and attestation reminders"
```

---

### Task 4: Move-in auto-create in the sign-lease-contract edge function

> **CORRECTED during Task 9 verification (2026-07-10):** this task's premise was stale — `20260708150000` (merged the day before this plan) had already moved tenancy creation out of the edge function into the `trg_create_tenancy_from_signed_lease` DB trigger, making the function's tenancy block dead code. The edge-function change below was reverted and replaced by `20260710110000_move_in_condition_record_trigger.sql`: an AFTER INSERT trigger on `tenancies` that creates the move-in record + both notifications for every tenancy-creation path. Verified end-to-end through the real signing flow.

**Files:**
- Modify: `supabase/functions/sign-lease-contract/index.ts` (the tenancy-creation block, around lines 128–160)

**Interfaces:**
- Consumes: `public.condition_records` (Task 2), existing `create_notification` RPC. The function already runs with the service role, so RLS is bypassed and the unique constraint is the only duplicate guard needed.

- [x] **Step 1: Modify the tenancy-creation block**

In `supabase/functions/sign-lease-contract/index.ts`, the existing code inside `if (updateData.status === 'signed')` inserts the tenancy without reading the result:

```ts
            await supabase.from('tenancies').insert({
              property_id: contract.property_id,
              tenant_id: contract.tenant_id,
              landlord_id: contract.landlord_id,
              start_date: start,
              end_date: end,
              monthly_rent: Number(cd.rentAmount) || 0,
              security_deposit: Number(cd.depositAmount) || 0,
              status: 'active',
            });
```

Replace that statement with:

```ts
            const { data: newTenancy } = await supabase
              .from('tenancies')
              .insert({
                property_id: contract.property_id,
                tenant_id: contract.tenant_id,
                landlord_id: contract.landlord_id,
                start_date: start,
                end_date: end,
                monthly_rent: Number(cd.rentAmount) || 0,
                security_deposit: Number(cd.depositAmount) || 0,
                status: 'active',
              })
              .select('id')
              .single();

            // Move-in condition record starts automatically with the tenancy
            // (ADR-0004); unique (tenancy_id, event_type) makes this idempotent.
            if (newTenancy) {
              const { error: crError } = await supabase
                .from('condition_records')
                .insert({ tenancy_id: newTenancy.id, event_type: 'move_in' });
              if (crError && crError.code !== '23505') {
                console.error('Move-in condition record creation failed:', crError);
              } else if (!crError) {
                const msg =
                  'Your move-in condition record has been started. Photograph the property at handover.';
                await supabase.rpc('create_notification', {
                  _user_id: contract.tenant_id,
                  _message: msg,
                  _link_url: '/tenant-dashboard/condition-records',
                  _type: 'condition_record',
                  _metadata: { tenancy_id: newTenancy.id },
                });
                await supabase.rpc('create_notification', {
                  _user_id: contract.landlord_id,
                  _message: msg,
                  _link_url: '/enhancedlandlorddashboard/condition-records',
                  _type: 'condition_record',
                  _metadata: { tenancy_id: newTenancy.id },
                });
              }
            }
```

This stays inside the existing `try { ... } catch (e) { console.error('Tenancy creation on full-sign failed:', e); }` so a condition-record failure never blocks contract signing.

- [x] **Step 2: Verify locally**

```bash
npm run supabase -- functions serve sign-lease-contract
```

Expected: the function serves without a Deno syntax/compile error (Ctrl-C after it reports listening). Full end-to-end (sign a lease → record appears) happens in Task 9's verification pass.

- [x] **Step 3: Commit**

```bash
git add supabase/functions/sign-lease-contract/index.ts
git commit -m "feat(lease): auto-create move-in condition record when tenancy starts"
```

---

### Task 5: Feature slice data hooks

**Files:**
- Create: `packages/features/src/condition-record/hooks/useConditionRecords.ts`
- Create: `packages/features/src/condition-record/hooks/useConditionRecordDetail.ts`
- Create: `packages/features/src/condition-record/index.ts`

**Interfaces:**
- Consumes: `supabase` from `@mzanzihomes/supabase/client`; types/helpers from `@mzanzihomes/common` (Task 1); tables/RPCs from Task 2.
- Produces (Task 6 relies on these exact shapes):

```ts
// useConditionRecords()
{
  records: ConditionRecordListItem[];   // { record: ConditionRecord; tenancy: TenancySummary; propertyTitle: string }
  activeTenancies: TenancySummary[];    // { id, property_id, tenant_id, landlord_id, start_date, end_date, status }
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createRecord: (tenancyId: string, eventType: ConditionEventType) => Promise<void>;
}

// useConditionRecordDetail(recordId: string | null)
{
  record: ConditionRecord | null;
  tenancy: TenancySummary | null;
  myParty: ConditionParty | null;
  photos: PhotoWithUrl[];               // ConditionPhoto & { url: string }
  loading: boolean;
  error: string | null;
  uploadPhotos: (files: File[], locationTag: string) => Promise<void>;
  deletePhoto: (photo: ConditionPhoto) => Promise<void>;
  attest: () => Promise<void>;
  saveNotes: (notes: string) => Promise<void>;
}
```

**Note on tables missing from generated types:** `packages/supabase/src/types.ts` will not know the new tables until types are regenerated (Task 8). Follow the codebase's existing pattern for this situation (see `apps/tenant/src/hooks/useInventory.tsx`): `const db = supabase as any;` at the top of each hook, with a `// ponytail: untyped until supabase types regen (Task 8)` comment.

- [x] **Step 1: Write the list hook**

`packages/features/src/condition-record/hooks/useConditionRecords.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import type { ConditionEventType, ConditionRecord } from '@mzanzihomes/common';

export interface TenancySummary {
  id: string;
  property_id: string;
  tenant_id: string;
  landlord_id: string;
  start_date: string;
  end_date: string;
  status: string;
}

export interface ConditionRecordListItem {
  record: ConditionRecord;
  tenancy: TenancySummary;
  propertyTitle: string;
}

export function useConditionRecords() {
  const [records, setRecords] = useState<ConditionRecordListItem[]>([]);
  const [activeTenancies, setActiveTenancies] = useState<TenancySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = supabase as any; // ponytail: untyped until supabase types regen (Task 8)

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setRecords([]);
        setActiveTenancies([]);
        return;
      }
      // RLS already scopes tenancies to the caller; the or-filter is belt and braces.
      const { data: tenancies, error: tErr } = await db
        .from('tenancies')
        .select('id, property_id, tenant_id, landlord_id, start_date, end_date, status')
        .or(`tenant_id.eq.${uid},landlord_id.eq.${uid}`);
      if (tErr) throw tErr;
      const tList: TenancySummary[] = tenancies ?? [];
      setActiveTenancies(tList.filter((t) => t.status === 'active'));
      if (tList.length === 0) {
        setRecords([]);
        return;
      }

      const [{ data: recs, error: rErr }, { data: props, error: pErr }] = await Promise.all([
        db
          .from('condition_records')
          .select('*')
          .in('tenancy_id', tList.map((t) => t.id))
          .order('created_at', { ascending: false }),
        db
          .from('properties')
          .select('id, title')
          .in('id', tList.map((t) => t.property_id)),
      ]);
      if (rErr) throw rErr;
      if (pErr) throw pErr;

      const tenancyById = new Map(tList.map((t) => [t.id, t]));
      const titleByPropertyId = new Map((props ?? []).map((p: any) => [p.id, p.title]));
      setRecords(
        ((recs ?? []) as ConditionRecord[]).map((record) => {
          const tenancy = tenancyById.get(record.tenancy_id)!;
          return {
            record,
            tenancy,
            propertyTitle: titleByPropertyId.get(tenancy.property_id) ?? 'Property',
          };
        }),
      );
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const createRecord = useCallback(
    async (tenancyId: string, eventType: ConditionEventType) => {
      const { error: err } = await db
        .from('condition_records')
        .insert({ tenancy_id: tenancyId, event_type: eventType });
      // 23505 = someone else created it first; that's success for our purposes
      if (err && err.code !== '23505') throw err;
      await refetch();
    },
    [refetch],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { records, activeTenancies, loading, error, refetch, createRecord };
}
```

- [x] **Step 2: Write the detail hook**

`packages/features/src/condition-record/hooks/useConditionRecordDetail.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import type { ConditionParty, ConditionPhoto, ConditionRecord } from '@mzanzihomes/common';
import type { TenancySummary } from './useConditionRecords';

export type PhotoWithUrl = ConditionPhoto & { url: string };

const BUCKET = 'condition-photos';
const SIGNED_URL_TTL = 3600;

export function useConditionRecordDetail(recordId: string | null) {
  const [record, setRecord] = useState<ConditionRecord | null>(null);
  const [tenancy, setTenancy] = useState<TenancySummary | null>(null);
  const [myParty, setMyParty] = useState<ConditionParty | null>(null);
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const db = supabase as any; // ponytail: untyped until supabase types regen (Task 8)

  const refetch = useCallback(async () => {
    if (!recordId) return;
    setError(null);
    try {
      const { data: rec, error: rErr } = await db
        .from('condition_records')
        .select('*')
        .eq('id', recordId)
        .single();
      if (rErr) throw rErr;
      setRecord(rec as ConditionRecord);

      const { data: ten, error: tErr } = await db
        .from('tenancies')
        .select('id, property_id, tenant_id, landlord_id, start_date, end_date, status')
        .eq('id', rec.tenancy_id)
        .single();
      if (tErr) throw tErr;
      setTenancy(ten as TenancySummary);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      setMyParty(uid === ten.tenant_id ? 'tenant' : uid === ten.landlord_id ? 'landlord' : null);

      const { data: ph, error: pErr } = await db
        .from('condition_photos')
        .select('*')
        .eq('record_id', recordId)
        .order('created_at', { ascending: true });
      if (pErr) throw pErr;
      const list = (ph ?? []) as ConditionPhoto[];

      if (list.length === 0) {
        setPhotos([]);
      } else {
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(list.map((p) => p.storage_path), SIGNED_URL_TTL);
        if (sErr) throw sErr;
        const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
        setPhotos(list.map((p) => ({ ...p, url: urlByPath.get(p.storage_path) ?? '' })));
      }
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  const uploadPhotos = useCallback(
    async (files: File[], locationTag: string) => {
      if (!recordId) return;
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Not signed in');
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${recordId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
        if (upErr) throw upErr;
        const { error: insErr } = await db.from('condition_photos').insert({
          record_id: recordId,
          uploaded_by: uid,
          location_tag: locationTag,
          storage_path: path,
        });
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw insErr;
        }
      }
      await refetch();
    },
    [recordId, refetch],
  );

  const deletePhoto = useCallback(
    async (photo: ConditionPhoto) => {
      const { error: delErr } = await db.from('condition_photos').delete().eq('id', photo.id);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      await refetch();
    },
    [refetch],
  );

  const attest = useCallback(async () => {
    if (!recordId) return;
    const { error: err } = await db.rpc('attest_condition_record', { p_record_id: recordId });
    if (err) throw err;
    await refetch();
  }, [recordId, refetch]);

  const saveNotes = useCallback(
    async (notes: string) => {
      if (!recordId) return;
      const { error: err } = await db.rpc('set_condition_notes', {
        p_record_id: recordId,
        p_notes: notes,
      });
      if (err) throw err;
      await refetch();
    },
    [recordId, refetch],
  );

  // Both parties watch the shared gallery live (immediate-visibility requirement).
  useEffect(() => {
    if (!recordId) return;
    refetch();
    const channel = supabase
      .channel(`condition-record-${recordId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'condition_photos', filter: `record_id=eq.${recordId}` },
        () => refetch(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'condition_records', filter: `id=eq.${recordId}` },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [recordId, refetch]);

  return { record, tenancy, myParty, photos, loading, error, uploadPhotos, deletePhoto, attest, saveNotes };
}
```

- [x] **Step 3: Write the slice barrel**

`packages/features/src/condition-record/index.ts`:

```ts
export { useConditionRecords } from './hooks/useConditionRecords';
export type { ConditionRecordListItem, TenancySummary } from './hooks/useConditionRecords';
export { useConditionRecordDetail } from './hooks/useConditionRecordDetail';
export type { PhotoWithUrl } from './hooks/useConditionRecordDetail';
```

(The page component is added to this barrel in Task 6.)

- [x] **Step 4: Typecheck**

Run from the repo root: `npx tsc --noEmit -p packages/features` (if the package has no own tsconfig for this, `npm run build` at root and confirm no new errors mention `condition-record`).
Expected: no errors in `packages/features/src/condition-record/`.

- [x] **Step 5: Commit**

```bash
git add packages/features/src/condition-record/
git commit -m "feat(condition-record): data hooks for records, photos, attestation"
```

---

### Task 6: UI — Condition Records page (list + detail + attestation)

**Files:**
- Create: `packages/features/src/condition-record/components/ConditionRecordsPage.tsx`
- Modify: `packages/features/src/condition-record/index.ts` (add the page export)

One page component serves both apps; the party-specific behaviour all derives from `myParty` in the detail hook. List and detail live in one route (detail is internal state, not a sub-route) — mirrors how the old inventory page worked with `?id=`.

**Interfaces:**
- Consumes: hooks from Task 5; helpers/constants from `@mzanzihomes/common`; UI primitives from `@mzanzihomes/ui`.
- Produces: `<ConditionRecordsPage />` (no props) — exported from `@mzanzihomes/features/condition-record`.

**Import-path check before writing:** open `packages/features/src/property/components/InventoryStartPanel.tsx` and copy its exact import specifiers for Button/Card/Badge/toast (e.g. `@mzanzihomes/ui/components/ui/button`). Use those same specifiers below — the paths in this plan assume that convention; adjust if the real one differs.

- [x] **Step 1: Write the page component**

`packages/features/src/condition-record/components/ConditionRecordsPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/ui/card';
import { Badge } from '@mzanzihomes/ui/components/ui/badge';
import { Textarea } from '@mzanzihomes/ui/components/ui/textarea';
import {
  LOCATION_TAGS,
  conditionRecordState,
  groupPhotosByLocation,
  type ConditionEventType,
  type ConditionRecordState,
} from '@mzanzihomes/common';
import { useConditionRecords, type ConditionRecordListItem } from '../hooks/useConditionRecords';
import { useConditionRecordDetail } from '../hooks/useConditionRecordDetail';

const EVENT_LABEL: Record<ConditionEventType, string> = {
  move_in: 'Move-in',
  move_out: 'Move-out',
};

const STATE_LABEL: Record<ConditionRecordState, string> = {
  open: 'Open — collecting photos',
  awaiting_tenant: 'Awaiting tenant attestation',
  awaiting_landlord: 'Awaiting landlord attestation',
  locked: 'Locked',
};

export function ConditionRecordsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const list = useConditionRecords();

  if (selectedId) {
    return (
      <RecordDetail
        recordId={selectedId}
        onBack={() => {
          setSelectedId(null);
          list.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 p-4">
      {list.loading && <p className="text-muted-foreground">Loading condition records…</p>}
      {list.error && <p className="text-destructive">{list.error}</p>}
      {!list.loading && list.records.length === 0 && (
        <p className="text-muted-foreground">No condition records yet.</p>
      )}
      {list.records.map((item) => (
        <RecordCard key={item.record.id} item={item} onOpen={() => setSelectedId(item.record.id)} />
      ))}
      <StartRecordButtons list={list} />
    </div>
  );
}

function RecordCard({ item, onOpen }: { item: ConditionRecordListItem; onOpen: () => void }) {
  const state = conditionRecordState(item.record);
  return (
    <Card className="cursor-pointer hover:bg-accent/50" onClick={onOpen}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            {item.propertyTitle} — {EVENT_LABEL[item.record.event_type]}
          </span>
          <Badge variant={state === 'locked' ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Started {new Date(item.record.created_at).toLocaleDateString()}
        {state === 'locked' && item.record.landlord_attested_at && item.record.tenant_attested_at && (
          <>
            {' · '}Locked{' '}
            {new Date(
              [item.record.tenant_attested_at, item.record.landlord_attested_at].sort().slice(-1)[0]!,
            ).toLocaleDateString()}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Manual creation covers early terminations and pre-auto-create tenancies;
// the DB unique constraint dedupes against the cron/edge-function paths.
function StartRecordButtons({ list }: { list: ReturnType<typeof useConditionRecords> }) {
  const missing = useMemo(() => {
    const have = new Set(list.records.map((r) => `${r.record.tenancy_id}:${r.record.event_type}`));
    return list.activeTenancies.flatMap((t) =>
      (['move_in', 'move_out'] as ConditionEventType[])
        .filter((e) => !have.has(`${t.id}:${e}`))
        .map((e) => ({ tenancy: t, eventType: e })),
    );
  }, [list.records, list.activeTenancies]);

  if (missing.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {missing.map(({ tenancy, eventType }) => (
        <Button
          key={`${tenancy.id}:${eventType}`}
          variant="outline"
          onClick={() => list.createRecord(tenancy.id, eventType)}
        >
          Start {EVENT_LABEL[eventType].toLowerCase()} record
        </Button>
      ))}
    </div>
  );
}

function RecordDetail({ recordId, onBack }: { recordId: string; onBack: () => void }) {
  const d = useConditionRecordDetail(recordId);
  const [locationTag, setLocationTag] = useState<string>(LOCATION_TAGS[0]);
  const [uploading, setUploading] = useState(false);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  if (d.loading || !d.record || !d.tenancy) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <p className="text-muted-foreground">{d.error ?? 'Loading…'}</p>
      </div>
    );
  }

  const state = conditionRecordState(d.record);
  const locked = state === 'locked';
  const iHaveAttested =
    d.myParty === 'tenant' ? !!d.record.tenant_attested_at : !!d.record.landlord_attested_at;
  const myNotes = d.myParty === 'tenant' ? d.record.tenant_notes : d.record.landlord_notes;
  const theirNotes = d.myParty === 'tenant' ? d.record.landlord_notes : d.record.tenant_notes;
  const groups = groupPhotosByLocation(d.photos);
  const photoById = new Map(d.photos.map((p) => [p.id, p]));

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await d.uploadPhotos(Array.from(files), locationTag);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← Back</Button>
        <Badge variant={locked ? 'default' : 'secondary'}>{STATE_LABEL[state]}</Badge>
      </div>

      {!locked && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Add photos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={locationTag}
              onChange={(e) => setLocationTag(e.target.value)}
            >
              {LOCATION_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => onFiles(e.target.files)}
            />
            {uploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
          </CardContent>
        </Card>
      )}

      {groups.length === 0 && <p className="text-muted-foreground">No photos yet.</p>}
      {groups.map((group) => (
        <div key={group.location}>
          <h3 className="mb-2 font-medium">{group.location}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.photos.map((p) => {
              const photo = photoById.get(p.id)!;
              const isMine =
                d.myParty === 'tenant'
                  ? photo.uploaded_by === d.tenancy!.tenant_id
                  : photo.uploaded_by === d.tenancy!.landlord_id;
              return (
                <div key={p.id} className="relative overflow-hidden rounded-md border">
                  <img src={photo.url} alt={p.location_tag} className="aspect-square w-full object-cover" />
                  <Badge className="absolute left-1 top-1" variant={isMine ? 'default' : 'secondary'}>
                    {photo.uploaded_by === d.tenancy!.tenant_id ? 'Tenant' : 'Landlord'}
                  </Badge>
                  {!locked && isMine && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute bottom-1 right-1"
                      onClick={() => d.deletePhoto(photo)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Anything a photo can't show (e.g. geyser age, remotes handed over)…"
            value={notesDraft ?? myNotes ?? ''}
            disabled={locked}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              if (notesDraft !== null && notesDraft !== (myNotes ?? '')) d.saveNotes(notesDraft);
            }}
          />
          {theirNotes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{d.myParty === 'tenant' ? 'Landlord' : 'Tenant'} notes:</span>{' '}
              {theirNotes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attestation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{d.record.attestation_text}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <AttestationStatus label="Tenant" at={d.record.tenant_attested_at} />
            <AttestationStatus label="Landlord" at={d.record.landlord_attested_at} />
          </div>
          {!locked && d.myParty && (
            <Button disabled={iHaveAttested} onClick={() => d.attest()}>
              {iHaveAttested ? 'You have attested' : 'I agree'}
            </Button>
          )}
          {!locked && (
            <p className="text-xs text-muted-foreground">
              Adding or removing any photo clears all attestations; once both parties agree the
              record locks permanently.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AttestationStatus({ label, at }: { label: string; at: string | null }) {
  return (
    <span>
      {label}:{' '}
      {at ? (
        <span className="text-green-600">agreed {new Date(at).toLocaleString()}</span>
      ) : (
        <span className="text-muted-foreground">not yet agreed</span>
      )}
    </span>
  );
}
```

- [x] **Step 2: Export from the slice barrel**

Append to `packages/features/src/condition-record/index.ts`:

```ts
export { ConditionRecordsPage } from './components/ConditionRecordsPage';
```

- [x] **Step 3: Typecheck / build**

Run: `npm run build` from the repo root.
Expected: no new errors referencing `condition-record` files (fix any import-specifier mismatch against the convention found in `InventoryStartPanel.tsx`).

- [x] **Step 4: Commit**

```bash
git add packages/features/src/condition-record/
git commit -m "feat(condition-record): shared page with grouped gallery and attestation"
```

---

### Task 7: Wire routes, navigation, and notification routing in both apps

**Files:**
- Modify: `apps/tenant/src/components/dashboard/TenantDashboardRoutes.tsx`
- Modify: `apps/landlord/src/components/dashboard/LandlordDashboardRoutes.tsx`
- Modify: `apps/landlord/src/App.tsx` (routes around lines 175–186)
- Modify: `packages/ui/src/components/dashboard/EnhancedSidebar.tsx` (lines ~40–41 tenant items, ~93–96 landlord item)
- Modify: `packages/common/src/constants/dashboardPageConfig.ts` (entries at lines ~85, ~148, ~155, ~253, ~260)
- Modify: `packages/ui/src/utils/notificationRoutes.ts`

Route path everywhere: `condition-records`. **The landlord `PlanGuard requiredPlan="pro"` gate is dropped**: the record needs both parties, and the tenant can create it regardless — gating the landlord out of evidence they must attest breaks the feature.

> **SCOPE CHANGE 2026-07-10 (ADR-0004 amendment): Inventory is KEPT** as the furnished-property stock list. Only Inspection is replaced by Condition Records. Everywhere below, inventory routes/nav/config/notification entries stay untouched; only inspection entries are replaced.

- [x] **Step 1: Tenant routes**

In `TenantDashboardRoutes.tsx`, replace the `inspection` route only (keep the `inventory` route; swap the `TenantInspection` import for the new import, keep `TenantInventory`):

```tsx
import { ConditionRecordsPage } from '@mzanzihomes/features/condition-record';
```

```tsx
      <Route path="condition-records" element={
        <EnhancedDashboardLayout title="Condition Records">
          <ConditionRecordsPage />
        </EnhancedDashboardLayout>
      } />
```

If `@mzanzihomes/features/condition-record` isn't resolvable as a subpath, check how `@mzanzihomes/features/pages` is set up in `packages/features/package.json` `exports` and mirror that pattern for `./condition-record`.

- [x] **Step 2: Landlord routes**

In `LandlordDashboardRoutes.tsx`, replace the `inspection` and `inspection/start` routes (lines ~121–133) with:

```tsx
      <Route path="condition-records" element={
        <EnhancedDashboardLayout title="Condition Records">
          <ConditionRecordsPage />
        </EnhancedDashboardLayout>
      } />
```

In `apps/landlord/src/App.tsx`, replace the `/enhancedlandlorddashboard/inspection` and `/enhancedlandlorddashboard/inspection/start` routes (lines ~175–186) with:

```tsx
        <Route path="/enhancedlandlorddashboard/condition-records" element={
          <DashboardShell title="Condition Records" currentTab="/enhancedlandlorddashboard/condition-records">
            <ConditionRecordsPage />
          </DashboardShell>
        } />
```

Update imports accordingly (remove `LandlordInspection`; other old imports are removed in Task 8 when their routes go).

- [x] **Step 3: Sidebar and page config**

`EnhancedSidebar.tsx`: keep the tenant `Inventory` item; replace only the tenant `Inspection` item (`/tenant/inspection`) — keep whichever base path prefix the surrounding tenant items use:

```ts
  { title: 'Condition Records', url: '/tenant/condition-records', icon: Camera },
```

Replace the landlord `Inspection` item (~line 93) with:

```ts
  {
    title: 'Condition Records',
    url: '/enhancedlandlorddashboard/condition-records',
    icon: Camera,
    description: 'Photograph and attest property condition at move-in and move-out',
  },
```

(`Camera` from `lucide-react`; drop the now-unused `Clipboard`/`FileText` imports if nothing else uses them.)

`dashboardPageConfig.ts`: KEEP all inventory-keyed entries; delete only the inspection-keyed entries (`/inspection`, `/enhancedlandlorddashboard/inspection`); add, mirroring the exact shape of a neighbouring entry:

```ts
  '/enhancedtenantdashboard/condition-records': {
    title: 'Condition Records',
    // copy remaining fields (subtitle/icon/etc.) in the file's established shape
  },
  '/enhancedlandlorddashboard/condition-records': {
    title: 'Condition Records',
    // same
  },
```

- [x] **Step 4: Notification routing**

`packages/ui/src/utils/notificationRoutes.ts` (inventory entries all STAY; add condition_record alongside):
- In the type-sniffing chain (~line 93), ADD a `t.includes('condition') ? 'condition_record'` branch (keep the `t.includes('inventory')` branch).
- ADD a case block (keep `case 'inventory':`):

```ts
    case 'condition_record':
      return isLandlord
        ? landlordPath(`${landlordBase}/condition-records`)
        : `${tenantBase}/condition-records`;
```

- In the two path-validation regexes (~lines 161, 165), replace the `inspection` alternative with `condition-records` (keep `inventory`).
- ADD to the URL-builder map (~line 193), keeping the `inventory:` entry:

```ts
  conditionRecord: (isLandlord: boolean) =>
    isLandlord
      ? '/enhancedlandlorddashboard/condition-records'
      : '/tenant-dashboard/condition-records',
```

(`NotificationUrls.inventory` and its `notificationService.ts` call sites stay — inventory is kept.)

- [x] **Step 5: Build and eyeball**

```bash
npm run build
```

Expected: success. Then `npm run dev`, open the tenant app → sidebar shows "Condition Records", page loads (empty state) with no console errors; same for landlord app.

- [x] **Step 6: Commit**

```bash
git add apps/tenant apps/landlord packages/ui packages/common
git commit -m "feat(apps): route condition records in tenant and landlord apps, drop inspection pro-gate"
```

---

### Task 8: Delete the old inventory/inspection feature + drop tables

> **SCOPE CHANGE 2026-07-10 (ADR-0004 amendment): Inventory is KEPT.** This task now deletes the Inspection feature only. All inventory files, routes, tables, storage policies, and notification helpers stay.

**Files (delete — inspection only):**
- `apps/tenant/src/pages/tenant/TenantInspection.tsx`
- `apps/landlord/src/pages/LandlordInspection.tsx`
- `packages/features/src/inspection/` (entire slice — first verify nothing kept, e.g. inventory code, imports from it; `packages/ui/src/components/inspection/` STAYS: `InventoryStartPanel.tsx` imports `PhotoGallery`/`PhotoLightbox` from it)
- `packages/ui/src/components/pages/CreateInspection.tsx`
- `packages/common/src/types/inspection.ts`

**Files (modify):**
- `packages/common/src/index.ts` — remove the `./types/inspection` export line (keep `./types/inventory`)
- `apps/tenant/src/App.tsx` — remove `/inspections/new` route and the `CreateInspection` import (keep `/inventory/start` + `InventoryStart`)
- `apps/landlord/src/App.tsx` — remove `/inspections/new` route and leftover imports (keep `/inventory/start`)
- `packages/supabase/src/types.ts` — regenerate: `npm run supabase -- gen types typescript --local > packages/supabase/src/types.ts` (picks up condition_records/condition_photos, keeps inventory tables, loses the dropped inspection ones); if the file turns out to be hand-maintained (check git history first: `git log --oneline -3 packages/supabase/src/types.ts`), hand-remove the two inspection table blocks and hand-add `condition_records`/`condition_photos` in the same shape
- Create: `supabase/migrations/20260709102000_drop_inventory_inspection.sql`

- [x] **Step 1: Write the drop migration**

`supabase/migrations/20260709102000_drop_inventory_inspection.sql`:

```sql
-- Inspection is replaced by Condition Records (ADR-0004, as amended 2026-07-10:
-- Inventory is KEPT as the furnished-property stock list). Clean drop of the
-- inspection tables only, no data migration — confirmed no production data worth keeping.

DROP TABLE IF EXISTS public.inspection_items CASCADE;
DROP TABLE IF EXISTS public.inspection_records CASCADE;
```

Note: `admin_delete_property_function` guards every inspection delete with `IF EXISTS (information_schema.tables ...)`, so it survives the drop unchanged. The inventory tables, `notify_on_inventory_status_change`, and the kyc-uploads inventory-prefix storage policy all STAY.

- [x] **Step 2: Delete files and apply the modifications listed above**

```bash
git rm apps/tenant/src/pages/tenant/TenantInspection.tsx apps/landlord/src/pages/LandlordInspection.tsx \
  packages/ui/src/components/pages/CreateInspection.tsx packages/common/src/types/inspection.ts
git rm -r packages/features/src/inspection
```

Then make the listed modifications (removing exports, routes, imports, dead UI references).

- [x] **Step 3: Hunt stragglers**

```bash
grep -rni "inspection" apps packages --include='*.ts' --include='*.tsx' -l | grep -v node_modules
```

Expected survivors (leave untouched): ALL inventory code (kept feature); `packages/ui/src/components/inspection/` (PhotoGallery/PhotoLightbox — used by inventory; optionally rename the dir later); `packages/features/src/lease/templates/masterLeaseTemplate.ts` and `conditionReportTemplate.ts` (legal document wording); `packages/features/src/viewing/**` if the word appears in copy about viewings. Anything else referencing the deleted Inspection FEATURE — dashboards (`EnhancedTenantDashboard.tsx`, `EnhancedLandlordDashboard.tsx`), `TenantSupport.tsx`, `ToolGrid.tsx` styles map, notification types — remove or reword. Also check `supabase/functions/generate-lease-pdf/index.ts`: if its hit is template prose, leave it; if it queries dropped inspection tables, remove that query.

- [x] **Step 4: Verify everything still builds and migrations apply**

```bash
npm run supabase -- db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/condition_records.test.sql
npm run build
npm test
npm run lint:boundaries
```

Expected: all pass; smoke test still prints ALL PASS after the drop migration.

- [x] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: drop inspection, replaced by condition records (inventory kept as stock list)"
```

---

### Task 9: End-to-end verification

No new files — drive the real flow against the local stack (use the `verify` skill if available).

- [ ] **Step 1: Full flow, two browsers**

Run `npm run supabase -- db reset && npm run dev`. Seed or reuse a landlord+tenant pair with an active tenancy (fastest local path: insert a tenancy row directly via psql for two existing test users, then use the manual "Start move-in record" button).

Verify, as tenant in one browser and landlord in another:
1. Both see the same record; tenant uploads a Kitchen photo → appears for landlord (realtime or on refetch) with "Tenant" badge, grouped under Kitchen.
2. Landlord uploads to Bedroom 1 → grouping and badge correct; each party can delete only their own photo (no delete button on the other's).
3. Tenant attests → status "Awaiting landlord attestation". Landlord adds a photo → tenant's attestation clears (status back to open).
4. Both attest → "Locked", upload controls gone; direct API attempt to add a photo fails (verify via the smoke test already covering this at DB level).
5. Notes: each party saves notes; other party sees them read-only; notes refused after lock.

- [ ] **Step 2: Auto-creation paths**

- Move-in: sign a lease end-to-end locally (or invoke `sign-lease-contract` with a test contract) → tenancy + move-in condition record + two notifications exist.
- Move-out: set a tenancy's `end_date` to `current_date + 7` via psql, run the cron body manually (command from Task 3 Step 2) → move-out record + notifications created; run again → no duplicates.

- [ ] **Step 3: Report**

Report actual observed results per item — anything that failed, say so plainly with the output.

---

## Deferred (deliberately, per grilling session)

- PDF export of a locked record — pure read, additive later.
- Periodic mid-tenancy records — additive `event_type` later.
- "Other party attested" instant notification — weekly reminder covers it; add if users ask.
- `property_inspections` zombie table (touched only by `20251121120000_add_subscription_rls_policies.sql`, unused by app code) — out of scope; candidate for the post-review mass-change batch.

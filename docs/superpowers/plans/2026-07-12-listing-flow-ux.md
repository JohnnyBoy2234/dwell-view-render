# Listing Flow UX & Validation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the landlord rental listing wizard with SA property types, server-side drafts with visible autosave, structured address validation, upload-as-you-go photos with reordering, and a trust-building review/publish step.

**Architecture:** Evolve the existing 6-step wizard (`apps/landlord/src/pages/ListProperty.tsx` + step components in `packages/features/src/listing/`) in place. A new `useListingDraft` hook owns draft lifecycle and autosave against the `properties` table (a draft = an unlisted row). Pure validation/derivation logic lives in `validation.ts` and `draftLogic.ts` (unit-tested). Shared step components gain optional props defaulting to today's behaviour so the sale flow (`ListSale.tsx`) keeps working untouched.

**Tech Stack:** React 18 + TypeScript, react-hook-form, Supabase (`@mzanzihomes/supabase/client`), shadcn-ui components from `@mzanzihomes/ui`, `@dnd-kit/core` + `@dnd-kit/sortable` (new), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-listing-flow-ux-design.md`

---

## Context you need (read this first)

- Monorepo. The landlord app is `apps/landlord` (Vite, dev port 8082). Listing step components live in `packages/features/src/listing/` and are exported through `packages/features/src/listing/index.ts` (imported as `@mzanzihomes/features/listing`).
- **TypeScript baseline check** (the repo has pre-existing errors; your change must not add any):
  `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → must stay **14**.
  Also check web (**12**) and tenant (**19**) in the final task.
- **Tests:** `cd packages/features && npx vitest run` (vitest is hoisted at the repo root; Task 2 adds the package test script).
- **Database:** Supabase project id `rsfrvjaqxhoqavvscvwf`. Apply migrations with the Supabase MCP tool `apply_migration` AND commit the same SQL as a file in `supabase/migrations/`. Relevant existing columns of `public.properties`: `title/description/location/price/property_type` are NOT NULL; `bedrooms/bathrooms/parking_spaces` NOT NULL DEFAULT 0; `images TEXT[] DEFAULT '{}'`; `is_listed` boolean. `public.profiles` has a nullable `phone TEXT`.
- **Paywall:** publishing flips `is_listed = true`; a DB trigger may reject with a message containing `PUBLISH_PAYWALL` — the wizard already handles this and MUST keep doing so.
- **Sale flow:** `apps/landlord/src/pages/ListSale.tsx` renders `PropertyTypeStep`, `LocationStep` (with only `control`, `errors`), `DetailsStep`, `PhotosStep` (only `setValue`, `formData`), `ReviewStep` (with `isSale`). Every prop you add to these components must be optional with today's behaviour as the default.
- A PostToolUse hook may emit Next.js "use client"/async-searchParams recommendations — they are **false positives** on this Vite repo; ignore them.
- Work on a branch: `git checkout -b feat/listing-flow-ux` before Task 1 (skip if it already exists).

---

### Task 1: Migration — structured address columns

**Files:**
- Create: `supabase/migrations/20260712120000_property_address_fields.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Structured address for listings. All nullable: existing rows and the sale
-- flow are unaffected; requiredness is enforced by wizard validation.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS suburb text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_code text;
```

- [ ] **Step 2: Apply it to the live project**

Use the Supabase MCP tool `apply_migration` with `project_id: rsfrvjaqxhoqavvscvwf`, `name: property_address_fields`, and the SQL above.
Expected: success. Verify with `execute_sql`: `SELECT column_name FROM information_schema.columns WHERE table_name = 'properties' AND column_name IN ('street_address','suburb','city','province','postal_code');` → 5 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260712120000_property_address_fields.sql
git commit -m "feat: add structured address columns to properties"
```

---

### Task 2: Validation module (TDD) + test infra + types

**Files:**
- Modify: `packages/features/package.json`
- Modify: `packages/features/src/listing/types.ts`
- Create: `packages/features/src/listing/validation.ts`
- Test: `packages/features/src/listing/validation.test.ts`

- [ ] **Step 1: Add the test script and vitest devDependency**

In `packages/features/package.json`, mirror `packages/common/package.json`:

```json
{
  "name": "@mzanzihomes/features",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./*": "./src/*/index.ts"
  },
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^4.0.15"
  }
}
```

Run `npm install` at the repo root afterwards so the lockfile picks it up.

- [ ] **Step 2: Extend `ListingFormData`**

In `packages/features/src/listing/types.ts`, add the new optional fields (optional keeps `ListSale.tsx` compiling):

```ts
export interface ListingFormData {
  property_type: string;
  location: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm?: number;
  furnished: boolean;
  pets_allowed: boolean;
  amenities: string[];
  price: number;
  available_from?: string;
  // Existing (already-uploaded) photos are kept as URL strings; new photos are File objects.
  images: (File | string)[];
  // Structured address (rent flow). Optional so the sale flow keeps compiling.
  street_address?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  // Transient: bathroom sanity confirmation (never persisted).
  bathrooms_confirmed?: boolean;
}
```

(Keep `SaleListingFormData` unchanged.)

- [ ] **Step 3: Write the failing tests**

Create `packages/features/src/listing/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  SA_PROVINCES,
  PRICE_MIN,
  PRICE_MAX,
  MIN_PHOTOS,
  RECOMMENDED_PHOTOS,
  DESCRIPTION_MIN,
  priceWarning,
  needsBathroomConfirm,
  isValidPostalCode,
  isValidSaPhone,
  descriptionWarning,
  composeLocation,
  buildPublishChecklist,
} from './validation';

describe('constants', () => {
  it('lists the 9 SA provinces', () => {
    expect(SA_PROVINCES).toHaveLength(9);
    expect(SA_PROVINCES).toContain('Gauteng');
    expect(SA_PROVINCES).toContain('KwaZulu-Natal');
  });
  it('has sane bounds', () => {
    expect(PRICE_MIN).toBe(500);
    expect(PRICE_MAX).toBe(500000);
    expect(MIN_PHOTOS).toBe(5);
    expect(RECOMMENDED_PHOTOS).toBe(10);
    expect(DESCRIPTION_MIN).toBe(50);
  });
});

describe('priceWarning', () => {
  it('warns on unusually low rent', () => {
    expect(priceWarning(1500)).toMatch(/unusually low/i);
  });
  it('warns on unusually high rent', () => {
    expect(priceWarning(80000)).toMatch(/unusually high/i);
  });
  it('is silent in the normal range', () => {
    expect(priceWarning(12000)).toBeNull();
  });
  it('is silent when empty', () => {
    expect(priceWarning(undefined)).toBeNull();
    expect(priceWarning(0)).toBeNull();
  });
});

describe('needsBathroomConfirm', () => {
  it('flags bathrooms more than bedrooms + 2', () => {
    expect(needsBathroomConfirm(2, 5)).toBe(true);
  });
  it('accepts bathrooms up to bedrooms + 2', () => {
    expect(needsBathroomConfirm(2, 4)).toBe(false);
    expect(needsBathroomConfirm(0, 2)).toBe(false);
  });
  it('is silent when either value is missing', () => {
    expect(needsBathroomConfirm(undefined, 3)).toBe(false);
    expect(needsBathroomConfirm(2, undefined)).toBe(false);
  });
});

describe('isValidPostalCode', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPostalCode('0181')).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isValidPostalCode('181')).toBe(false);
    expect(isValidPostalCode('01810')).toBe(false);
    expect(isValidPostalCode('ABCD')).toBe(false);
    expect(isValidPostalCode('')).toBe(false);
  });
});

describe('isValidSaPhone', () => {
  it('accepts 0XXXXXXXXX and +27XXXXXXXXX', () => {
    expect(isValidSaPhone('0821234567')).toBe(true);
    expect(isValidSaPhone('+27821234567')).toBe(true);
    expect(isValidSaPhone('082 123 4567')).toBe(true); // spaces stripped
  });
  it('rejects wrong lengths and prefixes', () => {
    expect(isValidSaPhone('082123456')).toBe(false);
    expect(isValidSaPhone('1234567890')).toBe(false);
    expect(isValidSaPhone('')).toBe(false);
  });
});

describe('descriptionWarning', () => {
  it('warns under 150 chars', () => {
    expect(descriptionWarning('a'.repeat(60))).toMatch(/fewer enquiries/i);
  });
  it('is silent at 150+', () => {
    expect(descriptionWarning('a'.repeat(150))).toBeNull();
  });
});

describe('composeLocation', () => {
  it('joins suburb, city, province', () => {
    expect(composeLocation({ suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng' }))
      .toBe('Sandton, Johannesburg, Gauteng');
  });
  it('skips missing parts', () => {
    expect(composeLocation({ suburb: '', city: 'Cape Town', province: 'Western Cape' }))
      .toBe('Cape Town, Western Cape');
  });
});

describe('buildPublishChecklist', () => {
  const complete = {
    property_type: 'House',
    suburb: 'Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2196',
    description: 'a'.repeat(200),
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 2,
    amenities: ['Garden'],
    price: 15000,
    images: ['u1', 'u2', 'u3', 'u4', 'u5'],
  } as any;

  it('passes a complete listing with a phone on file', () => {
    const r = buildPublishChecklist(complete, '0821234567');
    expect(r.blockers).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });
  it('blocks under 5 photos', () => {
    const r = buildPublishChecklist({ ...complete, images: ['u1'] }, '0821234567');
    expect(r.blockers.some((b) => /photo/i.test(b))).toBe(true);
  });
  it('blocks missing address fields', () => {
    const r = buildPublishChecklist({ ...complete, province: '' }, '0821234567');
    expect(r.blockers.some((b) => /address/i.test(b))).toBe(true);
  });
  it('blocks a missing profile phone', () => {
    const r = buildPublishChecklist(complete, null);
    expect(r.blockers.some((b) => /phone/i.test(b))).toBe(true);
  });
  it('warns on short description, no parking info, no amenities', () => {
    const r = buildPublishChecklist(
      { ...complete, description: 'a'.repeat(60), parking_spaces: 0, amenities: [] },
      '0821234567'
    );
    expect(r.warnings.some((w) => /description/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /parking/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /amenities/i.test(w))).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd packages/features && npx vitest run src/listing/validation.test.ts`
Expected: FAIL — cannot resolve `./validation`.

- [ ] **Step 5: Implement `validation.ts`**

Create `packages/features/src/listing/validation.ts`:

```ts
// Pure listing validation rules and soft-warning helpers.
// Hard rules block; warnings render amber and never block.

export const SA_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
] as const;

export const PRICE_MIN = 500;
export const PRICE_MAX = 500000;
export const PRICE_LOW_WARNING = 2000;
export const PRICE_HIGH_WARNING = 75000;
export const MIN_PHOTOS = 5;
export const RECOMMENDED_PHOTOS = 10;
export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_SHORT_WARNING = 150;
export const MAX_ROOMS = 20;

export function priceWarning(price: number | undefined | null): string | null {
  if (!price || price <= 0) return null;
  if (price < PRICE_LOW_WARNING) return "That's unusually low — double-check the amount.";
  if (price > PRICE_HIGH_WARNING) return "That's unusually high for a rental — double-check the amount.";
  return null;
}

export function needsBathroomConfirm(
  bedrooms: number | undefined | null,
  bathrooms: number | undefined | null
): boolean {
  if (bedrooms == null || bathrooms == null) return false;
  if (Number.isNaN(Number(bedrooms)) || Number.isNaN(Number(bathrooms))) return false;
  return Number(bathrooms) > Number(bedrooms) + 2;
}

export function isValidPostalCode(code: string): boolean {
  return /^\d{4}$/.test((code ?? '').trim());
}

export function isValidSaPhone(phone: string): boolean {
  const cleaned = (phone ?? '').replace(/[\s-]/g, '');
  return /^(\+27|0)[1-9]\d{8}$/.test(cleaned);
}

export function descriptionWarning(text: string): string | null {
  const len = (text ?? '').trim().length;
  if (len >= DESCRIPTION_MIN && len < DESCRIPTION_SHORT_WARNING) {
    return 'Short descriptions get fewer enquiries — mention the layout, features and the area.';
  }
  return null;
}

export function composeLocation(parts: {
  suburb?: string;
  city?: string;
  province?: string;
}): string {
  return [parts.suburb, parts.city, parts.province]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

export interface PublishChecklist {
  blockers: string[];
  warnings: string[];
}

// `data` is the wizard form data; `profilePhone` is the landlord's profile
// phone (null/'' when missing). Photos count only URL strings (uploaded).
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

  const uploaded = (data.images ?? []).filter((i) => typeof i === 'string');
  if (uploaded.length < MIN_PHOTOS) {
    blockers.push(`Add at least ${MIN_PHOTOS} photos (you have ${uploaded.length}).`);
  } else if (uploaded.length < RECOMMENDED_PHOTOS) {
    warnings.push(`More photos get more enquiries — ${RECOMMENDED_PHOTOS}+ recommended.`);
  }

  if (
    !(data.suburb ?? '').trim() ||
    !(data.city ?? '').trim() ||
    !(data.province ?? '').trim() ||
    !isValidPostalCode(data.postal_code ?? '')
  ) {
    blockers.push('Complete the property address (suburb, city, province and postal code).');
  }

  if (!profilePhone || !isValidSaPhone(profilePhone)) {
    blockers.push('Add a phone number to your profile so tenants can be verified.');
  }

  const descLen = (data.description ?? '').trim().length;
  if (descLen >= DESCRIPTION_MIN && descLen < DESCRIPTION_SHORT_WARNING) {
    warnings.push('Your description is very short — longer descriptions get more enquiries.');
  }

  if (!data.parking_spaces || Number(data.parking_spaces) <= 0) {
    warnings.push('No parking information added.');
  }

  if (!data.amenities || data.amenities.length === 0) {
    warnings.push('No amenities selected — tick what your property offers.');
  }

  return { blockers, warnings };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd packages/features && npx vitest run src/listing/validation.test.ts`
Expected: PASS (all tests).

- [ ] **Step 7: Export from the listing index**

Append to `packages/features/src/listing/index.ts`:

```ts
export * from './validation';
```

- [ ] **Step 8: Commit**

```bash
git add packages/features/package.json package-lock.json packages/features/src/listing/types.ts packages/features/src/listing/validation.ts packages/features/src/listing/validation.test.ts packages/features/src/listing/index.ts
git commit -m "feat: listing validation rules with SA provinces and soft warnings"
```

---

### Task 3: Draft derivation logic (TDD)

**Files:**
- Create: `packages/features/src/listing/hooks/draftLogic.ts`
- Test: `packages/features/src/listing/hooks/draftLogic.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/features/src/listing/hooks/draftLogic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { deriveResumeStep, isIncompleteDraft, nextRetryDelay } from './draftLogic';

const completeRow = {
  property_type: 'House',
  suburb: 'Sandton',
  city: 'Johannesburg',
  province: 'Gauteng',
  postal_code: '2196',
  description: 'a'.repeat(60),
  bathrooms: 2,
  price: 15000,
  images: ['u1', 'u2', 'u3', 'u4', 'u5'],
};

describe('deriveResumeStep', () => {
  it('returns 1 when no property type', () => {
    expect(deriveResumeStep({ ...completeRow, property_type: '' })).toBe(1);
  });
  it('returns 2 when address or description incomplete', () => {
    expect(deriveResumeStep({ ...completeRow, province: null })).toBe(2);
    expect(deriveResumeStep({ ...completeRow, description: 'too short' })).toBe(2);
  });
  it('returns 3 when bathrooms not set', () => {
    expect(deriveResumeStep({ ...completeRow, bathrooms: 0 })).toBe(3);
  });
  it('returns 4 when price not set', () => {
    expect(deriveResumeStep({ ...completeRow, price: 0 })).toBe(4);
  });
  it('returns 5 when fewer than 5 photos', () => {
    expect(deriveResumeStep({ ...completeRow, images: ['u1'] })).toBe(5);
  });
  it('returns 6 when everything is complete', () => {
    expect(deriveResumeStep(completeRow)).toBe(6);
  });
});

describe('isIncompleteDraft', () => {
  it('is true for any row that resumes before review', () => {
    expect(isIncompleteDraft({ ...completeRow, price: 0 })).toBe(true);
  });
  it('is false for a complete (e.g. paywalled) unlisted row', () => {
    expect(isIncompleteDraft(completeRow)).toBe(false);
  });
});

describe('nextRetryDelay', () => {
  it('backs off exponentially and caps at 30s', () => {
    expect(nextRetryDelay(1)).toBe(2000);
    expect(nextRetryDelay(2)).toBe(4000);
    expect(nextRetryDelay(3)).toBe(8000);
    expect(nextRetryDelay(10)).toBe(30000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/features && npx vitest run src/listing/hooks/draftLogic.test.ts`
Expected: FAIL — cannot resolve `./draftLogic`.

- [ ] **Step 3: Implement `draftLogic.ts`**

```ts
import { DESCRIPTION_MIN, MIN_PHOTOS, isValidPostalCode } from '../validation';

// A draft row is a `properties` row with is_listed = false. The resume step
// is the first wizard step whose required data is missing. Bedrooms default
// to 0 in the DB (0 = bachelor is valid), so step 3 keys off bathrooms >= 1.
export function deriveResumeStep(row: Record<string, any>): number {
  if (!row.property_type) return 1;
  if (
    !(row.suburb ?? '').trim() ||
    !(row.city ?? '').trim() ||
    !(row.province ?? '').trim() ||
    !isValidPostalCode(row.postal_code ?? '') ||
    (row.description ?? '').trim().length < DESCRIPTION_MIN
  ) {
    return 2;
  }
  if (!row.bathrooms || Number(row.bathrooms) < 1) return 3;
  if (!row.price || Number(row.price) <= 0) return 4;
  if (!row.images || row.images.length < MIN_PHOTOS) return 5;
  return 6;
}

export function isIncompleteDraft(row: Record<string, any>): boolean {
  return deriveResumeStep(row) < 6;
}

export function nextRetryDelay(attempt: number): number {
  return Math.min(2000 * 2 ** (attempt - 1), 30000);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/features && npx vitest run src/listing/hooks/draftLogic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/listing/hooks/draftLogic.ts packages/features/src/listing/hooks/draftLogic.test.ts
git commit -m "feat: draft resume-step derivation and retry backoff"
```

---

### Task 4: useListingDraft hook + SaveStatusIndicator

**Files:**
- Create: `packages/features/src/listing/hooks/useListingDraft.ts`
- Create: `packages/features/src/listing/components/SaveStatusIndicator.tsx`
- Modify: `packages/features/src/listing/index.ts`

- [ ] **Step 1: Implement the hook**

Create `packages/features/src/listing/hooks/useListingDraft.ts`:

```ts
// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { isIncompleteDraft, nextRetryDelay } from './draftLogic';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Options {
  userId: string | undefined;
  // From ?propertyId= — editing an existing row skips draft discovery.
  existingPropertyId: string | null;
}

// Owns the server-side draft: creation, debounced field saves with retry,
// save-state for the indicator, and discovery of a resumable draft.
export function useListingDraft({ userId, existingPropertyId }: Options) {
  const [draftId, setDraftId] = useState<string | null>(existingPropertyId);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [resumeDraft, setResumeDraft] = useState<any | null>(null);

  const pending = useRef<Record<string, any>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempt = useRef(0);
  const draftIdRef = useRef<string | null>(existingPropertyId);
  draftIdRef.current = draftId ?? draftIdRef.current;

  // Discover the most recent incomplete unlisted draft to offer a resume.
  useEffect(() => {
    if (existingPropertyId || !userId) return;
    let cancelled = false;
    supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', userId)
      .eq('is_listed', false)
      .order('updated_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const draft = data.find(isIncompleteDraft);
        if (draft) setResumeDraft(draft);
      });
    return () => {
      cancelled = true;
    };
  }, [existingPropertyId, userId]);

  const flush = useCallback(async () => {
    const id = draftIdRef.current;
    if (!id) return;
    const fields = pending.current;
    if (Object.keys(fields).length === 0) return;
    pending.current = {};
    setSaveState('saving');
    const { error } = await supabase.from('properties').update(fields).eq('id', id);
    if (error) {
      // Merge back (newer edits win) and retry with backoff.
      pending.current = { ...fields, ...pending.current };
      setSaveState('error');
      attempt.current += 1;
      timer.current = setTimeout(() => void flush(), nextRetryDelay(attempt.current));
      return;
    }
    attempt.current = 0;
    setSaveState('saved');
    setLastSavedAt(Date.now());
  }, []);

  // Debounced save; call with the full row-shaped patch you want persisted.
  const save = useCallback(
    (fields: Record<string, any>) => {
      pending.current = { ...pending.current, ...fields };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 800);
    },
    [flush]
  );

  // Creates the draft row on first call (step 1 → Continue); saves after that.
  const ensureDraft = useCallback(
    async (fields: Record<string, any>): Promise<string | null> => {
      if (draftIdRef.current) {
        save(fields);
        return draftIdRef.current;
      }
      if (!userId) return null;
      setSaveState('saving');
      const { data, error } = await supabase
        .from('properties')
        .insert({
          landlord_id: userId,
          is_listed: false,
          title: '',
          description: '',
          location: '',
          price: 0,
          ...fields,
        })
        .select('id')
        .single();
      if (error || !data) {
        setSaveState('error');
        return null;
      }
      draftIdRef.current = data.id;
      setDraftId(data.id);
      setSaveState('saved');
      setLastSavedAt(Date.now());
      return data.id;
    },
    [userId, save]
  );

  const adoptDraft = useCallback((row: any) => {
    draftIdRef.current = row.id;
    setDraftId(row.id);
    setResumeDraft(null);
  }, []);

  const dismissResume = useCallback(() => setResumeDraft(null), []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return {
    draftId,
    saveState,
    lastSavedAt,
    save,
    flush,
    ensureDraft,
    resumeDraft,
    adoptDraft,
    dismissResume,
  };
}
```

- [ ] **Step 2: Implement the indicator**

Create `packages/features/src/listing/components/SaveStatusIndicator.tsx`:

```tsx
import * as React from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';
import type { SaveState } from '../hooks/useListingDraft';

interface Props {
  state: SaveState;
  lastSavedAt: number | null;
}

// Subtle autosave status shown beside the wizard title.
export function SaveStatusIndicator({ state, lastSavedAt }: Props) {
  const [, setTick] = React.useState(0);
  // Re-render every 5s so "Saved just now" ages into "Draft saved".
  React.useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  if (state === 'idle' && !lastSavedAt) return null;

  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
        <CloudOff className="h-3.5 w-3.5" /> Couldn't save — retrying
      </span>
    );
  }
  const justNow = lastSavedAt && Date.now() - lastSavedAt < 10_000;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="h-3.5 w-3.5 text-green-600" />
      {justNow ? 'Saved just now' : 'Draft saved'}
    </span>
  );
}
```

- [ ] **Step 3: Export both**

Append to `packages/features/src/listing/index.ts`:

```ts
export { useListingDraft } from './hooks/useListingDraft';
export type { SaveState } from './hooks/useListingDraft';
export { deriveResumeStep } from './hooks/draftLogic';
export { SaveStatusIndicator } from './components/SaveStatusIndicator';
```

- [ ] **Step 4: Verify typecheck baseline**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"`
Expected: `14`.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/listing/hooks/useListingDraft.ts packages/features/src/listing/components/SaveStatusIndicator.tsx packages/features/src/listing/index.ts
git commit -m "feat: server-side listing draft hook with visible save status"
```

---

### Task 5: PropertyTypeStep — grouped SA types with Other input

**Files:**
- Modify: `packages/features/src/listing/components/PropertyTypeStep.tsx` (full rewrite below)

- [ ] **Step 1: Rewrite the component**

Replace the file's contents with:

```tsx
import * as React from 'react';
import { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Input } from '@mzanzihomes/ui/components/input';
import {
  Home,
  Building2,
  Building,
  Trees,
  DoorOpen,
  GraduationCap,
  Store,
  PenLine,
  Layers,
} from 'lucide-react';
import { ListingFormData } from '../types';

interface PropertyTypeStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
}

const groups = [
  {
    heading: 'Homes',
    options: [
      { value: 'House', label: 'House', description: 'Standalone home with its own entrance', icon: Home },
      { value: 'Townhouse', label: 'Townhouse', description: 'Home in a complex or estate, often with shared walls', icon: Building },
      { value: 'Duplex', label: 'Duplex', description: 'Two-storey unit or a home split into two dwellings', icon: Layers },
    ],
  },
  {
    heading: 'Flats & cottages',
    options: [
      { value: 'Apartment / Flat', label: 'Apartment / Flat', description: 'Unit in a block — incl. bachelor & studio flats', icon: Building2 },
      { value: 'Garden Cottage / Flatlet', label: 'Garden Cottage / Flatlet', description: 'Separate unit on a shared property', icon: Trees },
    ],
  },
  {
    heading: 'Rooms & shared',
    options: [
      { value: 'Room to Rent', label: 'Room to Rent', description: 'Private room in a shared home', icon: DoorOpen },
      { value: 'Student Accommodation', label: 'Student Accommodation', description: 'Housing aimed at students, incl. commune rooms', icon: GraduationCap },
    ],
  },
  {
    heading: 'Other',
    options: [
      { value: 'Commercial Property', label: 'Commercial Property', description: 'Office, retail or industrial space', icon: Store },
    ],
  },
];

const KNOWN_VALUES = groups.flatMap((g) => g.options.map((o) => o.value));

export default function PropertyTypeStep({ control, errors }: PropertyTypeStepProps) {
  // Hoisted (not inside the Controller render) to respect rules-of-hooks.
  const [otherSelected, setOtherSelected] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">What type of property are you listing?</h2>
        <p className="text-muted-foreground">Choose the option that best describes your property</p>
      </div>

      <Controller
        name="property_type"
        control={control}
        rules={{ required: 'Please select a property type' }}
        render={({ field }) => {
          // Legacy/custom values (e.g. "Studio" from old listings) select Other.
          const isOtherValue = !!field.value && !KNOWN_VALUES.includes(field.value);
          const otherActive = otherSelected || isOtherValue;

          const selectCard = (value: string) => {
            setOtherSelected(false);
            field.onChange(value);
          };

          return (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.heading} className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.heading}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {group.options.map((type) => {
                      const IconComponent = type.icon;
                      const isSelected = !otherActive && field.value === type.value;
                      return (
                        <Card
                          key={type.value}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => selectCard(type.value)}
                        >
                          <CardContent className="p-4 flex items-center gap-3">
                            <IconComponent
                              className={`h-8 w-8 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold">{type.label}</h4>
                              <p className="text-sm text-muted-foreground">{type.description}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {group.heading === 'Other' && (
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          otherActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
                        }`}
                        onClick={() => {
                          setOtherSelected(true);
                          if (KNOWN_VALUES.includes(field.value)) field.onChange('');
                        }}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <PenLine
                            className={`h-8 w-8 shrink-0 ${otherActive ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          <div className="min-w-0">
                            <h4 className="font-semibold">Other</h4>
                            <p className="text-sm text-muted-foreground">Describe your own property type</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ))}

              {otherActive && (
                <div className="max-w-md mx-auto space-y-2">
                  <Input
                    autoFocus
                    maxLength={40}
                    placeholder="e.g. Backpackers, Retirement unit…"
                    value={KNOWN_VALUES.includes(field.value) ? '' : field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="text-base"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Give your property type a short name (max 40 characters)
                  </p>
                </div>
              )}
            </div>
          );
        }}
      />

      {errors.property_type && (
        <p className="text-sm text-destructive text-center">{errors.property_type.message}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck baseline**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"`
Expected: `14`.

- [ ] **Step 3: Commit**

```bash
git add packages/features/src/listing/components/PropertyTypeStep.tsx
git commit -m "feat: SA-market property types with grouped list and custom Other"
```

---

### Task 6: LocationStep — structured address form

**Files:**
- Modify: `packages/features/src/listing/components/LocationStep.tsx`

The component gains a `structuredAddress?: boolean` prop. When falsy (the sale flow's default), render **exactly today's UI** — keep the current single-location + description JSX unchanged. When true (rent wizard), render the structured form below. Keep the existing AI-generate handler as-is.

- [ ] **Step 1: Add the prop and the structured form**

Update the props interface and component:

```tsx
interface LocationStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  watch?: UseFormWatch<ListingFormData>;
  setValue?: UseFormSetValue<ListingFormData>;
  structuredAddress?: boolean;
}
```

Add imports:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mzanzihomes/ui/components/select';
import { SA_PROVINCES, isValidPostalCode, descriptionWarning, DESCRIPTION_MIN } from '../validation';
```

Add the Google Places component parser above the component:

```tsx
// Google Places returns address_components; map them to our fields.
const parsePlace = (place: any) => {
  const comps: any[] = place?.address_components || [];
  const get = (type: string) => comps.find((c) => c.types?.includes(type))?.long_name || '';
  const streetNumber = get('street_number');
  const route = get('route');
  return {
    street_address: [streetNumber, route].filter(Boolean).join(' '),
    suburb: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
    city: get('locality') || get('administrative_area_level_2'),
    province: get('administrative_area_level_1'),
    postal_code: get('postal_code'),
  };
};
```

When `structuredAddress` is true, render this instead of the single location field (description block follows it — shared by both modes, upgraded in Step 2):

```tsx
{/* Address */}
<div className="space-y-4">
  <div className="space-y-2">
    <Label className="flex items-center gap-2">
      <MapPin className="h-4 w-4" />
      Search your address
    </Label>
    <AddressAutocomplete
      value={watch?.('location') || ''}
      onChange={(v) => setValue?.('location', v)}
      onPlaceSelect={(place) => {
        const parsed = parsePlace(place);
        (Object.entries(parsed) as [any, string][]).forEach(([k, v]) => {
          if (v) setValue?.(k, v, { shouldValidate: true, shouldDirty: true });
        });
      }}
      placeholder="Start typing your address…"
      className="text-base"
    />
    <p className="text-sm text-muted-foreground">
      Pick your address and we'll fill in the fields below — you can correct any of them.
    </p>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="street_address">Street address (optional)</Label>
      <Controller
        name="street_address"
        control={control}
        render={({ field }) => (
          <Input {...field} value={field.value || ''} id="street_address" placeholder="12 Protea Road" className="text-base" />
        )}
      />
      <p className="text-xs text-muted-foreground">Not shown publicly until you choose to share it.</p>
    </div>

    <div className="space-y-2">
      <Label htmlFor="suburb">Suburb *</Label>
      <Controller
        name="suburb"
        control={control}
        rules={{ required: 'Suburb is required' }}
        render={({ field }) => (
          <Input {...field} value={field.value || ''} id="suburb" placeholder="Sandton" className="text-base" />
        )}
      />
      {errors.suburb && <p className="text-sm text-destructive">{errors.suburb.message}</p>}
    </div>

    <div className="space-y-2">
      <Label htmlFor="city">City *</Label>
      <Controller
        name="city"
        control={control}
        rules={{ required: 'City is required' }}
        render={({ field }) => (
          <Input {...field} value={field.value || ''} id="city" placeholder="Johannesburg" className="text-base" />
        )}
      />
      {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
    </div>

    <div className="space-y-2">
      <Label>Province *</Label>
      <Controller
        name="province"
        control={control}
        rules={{ required: 'Please select a province' }}
        render={({ field }) => (
          <Select value={field.value || ''} onValueChange={field.onChange}>
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Select province" />
            </SelectTrigger>
            <SelectContent>
              {SA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {errors.province && <p className="text-sm text-destructive">{errors.province.message}</p>}
    </div>

    <div className="space-y-2">
      <Label htmlFor="postal_code">Postal code *</Label>
      <Controller
        name="postal_code"
        control={control}
        rules={{
          required: 'Postal code is required',
          validate: (v) => isValidPostalCode(v || '') || 'Enter a 4-digit postal code',
        }}
        render={({ field }) => (
          <Input
            {...field}
            value={field.value || ''}
            id="postal_code"
            inputMode="numeric"
            maxLength={4}
            placeholder="2196"
            className="text-base"
          />
        )}
      />
      {errors.postal_code && <p className="text-sm text-destructive">{errors.postal_code.message}</p>}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Upgrade the description block (both modes)**

In the existing description block, keep the AI button and the 50-char rule, and add a live character count + soft warning under the textarea:

```tsx
{(() => {
  const desc = watch?.('description') || '';
  const warning = descriptionWarning(desc);
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
        {!errors.description && warning && (
          <p className="text-sm text-amber-600">{warning}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground shrink-0">
        {desc.trim().length} characters{desc.trim().length < DESCRIPTION_MIN ? ` (min ${DESCRIPTION_MIN})` : ''}
      </p>
    </div>
  );
})()}
```

(Replace the existing `errors.description` paragraph with this block; keep the helper paragraph below it.)

- [ ] **Step 3: Verify typecheck + sale flow unaffected**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → `14`.
`ListSale.tsx` passes no `structuredAddress`, so it renders the legacy single-location UI.

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/listing/components/LocationStep.tsx
git commit -m "feat: structured SA address form with Places autofill and description warnings"
```

---

### Task 7: DetailsStep + PricingStep validation upgrades

**Files:**
- Modify: `packages/features/src/listing/components/DetailsStep.tsx`
- Modify: `packages/features/src/listing/components/PricingStep.tsx`

- [ ] **Step 1: DetailsStep — bounds + bathroom sanity confirm**

Imports to add:

```tsx
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { MAX_ROOMS, needsBathroomConfirm } from '../validation';
```

Update the bedrooms Controller rules:

```tsx
rules={{
  required: 'Bedrooms is required',
  min: { value: 0, message: 'Minimum 0 bedrooms' },
  max: { value: MAX_ROOMS, message: `Maximum ${MAX_ROOMS} bedrooms` },
  validate: (v) => Number.isInteger(Number(v)) || 'Whole numbers only',
}}
```

Update the bathrooms Controller rules (the confirm gate lives here so `trigger(['bathrooms'])` blocks Continue):

```tsx
rules={{
  required: 'Bathrooms is required',
  min: { value: 1, message: 'Minimum 1 bathroom' },
  max: { value: MAX_ROOMS, message: `Maximum ${MAX_ROOMS} bathrooms` },
  validate: (v) => {
    if (!Number.isInteger(Number(v))) return 'Whole numbers only';
    if (needsBathroomConfirm(watch('bedrooms'), Number(v)) && !watch('bathrooms_confirmed')) {
      return 'Please tick the confirmation below';
    }
    return true;
  },
}}
```

After the basic-specs grid, add the inline confirm block (amber, not a popup):

```tsx
{needsBathroomConfirm(watch('bedrooms'), watch('bathrooms')) && (
  <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 flex items-start gap-3">
    <Checkbox
      id="bathrooms_confirmed"
      checked={!!watch('bathrooms_confirmed')}
      onCheckedChange={(v) => setValue('bathrooms_confirmed', !!v, { shouldValidate: true })}
      className="mt-0.5"
    />
    <Label htmlFor="bathrooms_confirmed" className="text-sm text-amber-800 dark:text-amber-200 font-normal cursor-pointer">
      {watch('bathrooms')} bathrooms for {watch('bedrooms')} bedroom{Number(watch('bedrooms')) === 1 ? '' : 's'} — is that right? Tick to confirm.
    </Label>
  </div>
)}
```

Also reset the confirmation whenever the counts change — add inside the component:

```tsx
const beds = watch('bedrooms');
const baths = watch('bathrooms');
React.useEffect(() => {
  setValue('bathrooms_confirmed', false);
}, [beds, baths, setValue]);
```

- [ ] **Step 2: PricingStep — new bounds + soft warnings**

Add a `watch` prop:

```tsx
interface PricingStepProps {
  control: Control<ListingFormData>;
  errors: FieldErrors<ListingFormData>;
  setValue: UseFormSetValue<ListingFormData>;
  watch?: UseFormWatch<ListingFormData>;
}
```

Import: `import { PRICE_MIN, PRICE_MAX, priceWarning } from '../validation';` and `UseFormWatch` from react-hook-form.

Update the price Controller rules:

```tsx
rules={{
  required: 'Monthly rent is required',
  min: { value: PRICE_MIN, message: `Minimum rent is R${PRICE_MIN.toLocaleString()}` },
  max: { value: PRICE_MAX, message: `Maximum rent is R${PRICE_MAX.toLocaleString()}` },
}}
```

Update the Input's `min`/`max` attributes to `{PRICE_MIN}` / `{PRICE_MAX}`, and below the existing error paragraph add:

```tsx
{!errors.price && watch && priceWarning(watch('price')) && (
  <p className="text-sm text-amber-600">{priceWarning(watch('price'))}</p>
)}
```

- [ ] **Step 3: Verify typecheck baseline**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → `14`.
(`ListSale.tsx` doesn't use PricingStep; DetailsStep changes are prop-compatible.)

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/listing/components/DetailsStep.tsx packages/features/src/listing/components/PricingStep.tsx
git commit -m "feat: room bounds, bathroom sanity confirm, and price soft warnings"
```

---

### Task 8: PhotoUploader + PhotosStep — upload-as-you-go

**Files:**
- Create: `packages/features/src/listing/components/PhotoUploader.tsx`
- Modify: `packages/features/src/listing/components/PhotosStep.tsx`
- Modify: `apps/landlord/package.json` (dnd-kit deps)
- Modify: `packages/features/src/listing/index.ts`

- [ ] **Step 1: Install dnd-kit**

From the repo root:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities --workspace=apps/landlord
```

(Hoisted to root `node_modules`, so `packages/features` imports resolve.)

- [ ] **Step 2: Implement PhotoUploader**

Create `packages/features/src/listing/components/PhotoUploader.tsx`:

```tsx
// @ts-nocheck
import * as React from 'react';
import { useRef, useState } from 'react';
import { DndContext, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { Camera, Loader2, RefreshCw, Star, Upload, X } from 'lucide-react';
import { MIN_PHOTOS, RECOMMENDED_PHOTOS } from '../validation';

const MAX_IMAGES = 15;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface PhotoItem {
  id: string;
  url?: string; // set when uploaded
  file?: File; // set while uploading / on error (for retry)
  status: 'uploading' | 'done' | 'error';
}

interface PhotoUploaderProps {
  userId: string;
  images: string[]; // already-uploaded URLs, in display order
  onImagesChange: (urls: string[]) => void; // called with ordered done-URLs
}

function storagePathFromUrl(url: string): string | null {
  const marker = '/object/public/property-images/';
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

function SortableTile({
  item,
  index,
  onRemove,
  onRetry,
  onMakeCover,
}: {
  item: PhotoItem;
  index: number;
  onRemove: () => void;
  onRetry: () => void;
  onMakeCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.status !== 'done',
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const src = item.url ?? (item.file ? URL.createObjectURL(item.file) : '');

  return (
    <div ref={setNodeRef} style={style} className="relative group touch-none" {...attributes} {...listeners}>
      <div className={`aspect-square rounded-lg overflow-hidden bg-muted ${isDragging ? 'ring-2 ring-primary' : ''}`}>
        {src ? <img src={src} alt={`Property photo ${index + 1}`} className="w-full h-full object-cover" /> : null}
        {item.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 text-white text-xs">
            <Loader2 className="h-6 w-6 animate-spin" />
            Uploading…
          </div>
        )}
        {item.status === 'error' && (
          <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2 text-white text-xs p-2 text-center">
            Upload failed
            <Button type="button" size="sm" variant="secondary" onClick={onRetry} className="h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        )}
      </div>

      {index === 0 && item.status === 'done' && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center gap-1">
          <Star className="h-3 w-3" /> Cover
        </div>
      )}

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      {index !== 0 && item.status === 'done' && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-2 left-2 h-7 text-[11px] px-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onMakeCover();
          }}
        >
          <Star className="h-3 w-3 mr-1" /> Make cover
        </Button>
      )}
    </div>
  );
}

export default function PhotoUploader({ userId, images, onImagesChange }: PhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [items, setItems] = useState<PhotoItem[]>(
    images.map((url) => ({ id: url, url, status: 'done' as const }))
  );
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const emit = (next: PhotoItem[]) => {
    setItems(next);
    onImagesChange(next.filter((i) => i.status === 'done' && i.url).map((i) => i.url!));
  };

  const uploadItem = async (id: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('property-images').upload(path, file);
    const current = itemsRef.current;
    if (!current.some((i) => i.id === id)) return; // removed while uploading
    if (error) {
      emit(current.map((i) => (i.id === id ? { ...i, status: 'error' } : i)));
      return;
    }
    const { data } = supabase.storage.from('property-images').getPublicUrl(path);
    emit(current.map((i) => (i.id === id ? { ...i, url: data.publicUrl, status: 'done' } : i)));
  };

  const addFiles = (files: File[]) => {
    const rejected = files.filter((f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_IMAGE_BYTES);
    let accepted = files.filter((f) => ACCEPTED_TYPES.includes(f.type) && f.size <= MAX_IMAGE_BYTES);
    if (rejected.length > 0) {
      toast({
        variant: 'destructive',
        title: `${rejected.length} photo${rejected.length > 1 ? 's' : ''} skipped`,
        description: 'Photos must be JPG, PNG or WebP and no larger than 10MB each.',
      });
    }
    const room = MAX_IMAGES - itemsRef.current.length;
    if (accepted.length > room) {
      toast({ title: 'Photo limit reached', description: `Only the first ${MAX_IMAGES} photos are kept.` });
      accepted = accepted.slice(0, Math.max(0, room));
    }
    if (accepted.length === 0) return;
    const newItems: PhotoItem[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'uploading' as const,
    }));
    emit([...itemsRef.current, ...newItems]);
    newItems.forEach((item) => void uploadItem(item.id, item.file!));
  };

  const removeItem = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    emit(itemsRef.current.filter((i) => i.id !== id));
    // Best-effort storage cleanup for uploaded photos.
    if (item?.url) {
      const path = storagePathFromUrl(item.url);
      if (path) void supabase.storage.from('property-images').remove([path]);
    }
  };

  const retryItem = (id: string) => {
    const item = itemsRef.current.find((i) => i.id === id);
    if (!item?.file) return;
    emit(itemsRef.current.map((i) => (i.id === id ? { ...i, status: 'uploading' } : i)));
    void uploadItem(id, item.file);
  };

  const makeCover = (id: string) => {
    const idx = itemsRef.current.findIndex((i) => i.id === id);
    if (idx <= 0) return;
    emit(arrayMove(itemsRef.current, idx, 0));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const doneCount = items.filter((i) => i.status === 'done').length;
  const progressPct = Math.min(100, (doneCount / RECOMMENDED_PHOTOS) * 100);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${doneCount < MIN_PHOTOS ? 'text-amber-600' : 'text-green-600'}`}>
            {doneCount} of {RECOMMENDED_PHOTOS} recommended photos
          </span>
          <span className="text-muted-foreground">
            {MIN_PHOTOS} minimum · {RECOMMENDED_PHOTOS}+ recommended
          </span>
        </div>
        <Progress value={progressPct} className="h-2" />
        {doneCount < MIN_PHOTOS && (
          <p className="text-xs text-amber-600">
            Add {MIN_PHOTOS - doneCount} more photo{MIN_PHOTOS - doneCount === 1 ? '' : 's'} before you can publish.
          </p>
        )}
      </div>

      {/* Upload zone */}
      <div className="border-2 border-dashed rounded-xl p-6 text-center space-y-3">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            if (e.target.files) addFiles(Array.from(e.target.files));
            e.target.value = '';
          }}
          className="sr-only"
          id="image-upload"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2"
          disabled={items.length >= MAX_IMAGES}
        >
          <Upload className="h-4 w-4" />
          {items.length === 0 ? 'Choose Photos' : 'Add More Photos'}
        </Button>
        <p className="text-xs text-muted-foreground">JPG, PNG or WebP · max 10MB each · up to {MAX_IMAGES} photos</p>
      </div>

      {/* Sortable grid */}
      {items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your photos ({items.length}/{MAX_IMAGES})</h3>
            <p className="text-sm text-muted-foreground">Drag to reorder — first photo is your cover</p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return;
              const from = itemsRef.current.findIndex((i) => i.id === active.id);
              const to = itemsRef.current.findIndex((i) => i.id === over.id);
              if (from !== -1 && to !== -1) emit(arrayMove(itemsRef.current, from, to));
            }}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.map((item, index) => (
                  <SortableTile
                    key={item.id}
                    item={item}
                    index={index}
                    onRemove={() => removeItem(item.id)}
                    onRetry={() => retryItem(item.id)}
                    onMakeCover={() => makeCover(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Rework PhotosStep**

`PhotosStep` gains an optional `upload` prop. Absent (sale flow) → today's deferred-File behaviour, byte-for-byte. Present (rent wizard) → guidance + PhotoUploader. Change the props interface and add the new branch **above** the existing return, keeping all current JSX as the fallback:

```tsx
import PhotoUploader from './PhotoUploader';
import { RECOMMENDED_PHOTOS } from '../validation';

const RECOMMENDED_SHOTS = ['Front exterior', 'Living room', 'Kitchen', 'Main bedroom', 'Bathroom'];

interface PhotosStepProps {
  setValue: UseFormSetValue<ListingFormData>;
  formData: ListingFormData;
  // Rent wizard: photos upload immediately and are autosaved to the draft.
  upload?: { userId: string; onSaved: (urls: string[]) => void };
}

export default function PhotosStep({ setValue, formData, upload }: PhotosStepProps) {
  // ... existing hooks stay ...

  if (upload) {
    const urls = (formData.images || []).filter((i): i is string => typeof i === 'string');
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Add photos of your property</h2>
          <p className="text-muted-foreground">
            Listings with more quality photos receive significantly more tenant enquiries.
          </p>
        </div>

        {/* Quality tips — read before uploading */}
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">📸 Photo tips</h3>
                <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                  <li>• Shoot during the day with good natural light</li>
                  <li>• Clean and declutter each room first</li>
                  <li>• Use landscape orientation</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommended shots */}
        <div className="flex flex-wrap items-center gap-2 justify-center">
          <span className="text-sm text-muted-foreground">Recommended shots:</span>
          {RECOMMENDED_SHOTS.map((shot) => (
            <span key={shot} className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1">
              {shot}
            </span>
          ))}
        </div>

        <PhotoUploader
          userId={upload.userId}
          images={urls}
          onImagesChange={(next) => {
            setValue('images', next, { shouldDirty: true });
            upload.onSaved(next);
          }}
        />
      </div>
    );
  }

  // Legacy deferred-upload behaviour (sale flow) — existing JSX unchanged below.
  ...
}
```

- [ ] **Step 4: Export PhotoUploader**

Append to `packages/features/src/listing/index.ts`:

```ts
export { default as PhotoUploader } from './components/PhotoUploader';
```

- [ ] **Step 5: Verify typecheck baseline**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → `14`.

- [ ] **Step 6: Commit**

```bash
git add apps/landlord/package.json package-lock.json packages/features/src/listing/components/PhotoUploader.tsx packages/features/src/listing/components/PhotosStep.tsx packages/features/src/listing/index.ts
git commit -m "feat: upload-as-you-go photos with progress, retry, dnd reorder and cover"
```

---

### Task 9: ReviewStep — edit buttons, checklist, declaration, contact check

**Files:**
- Modify: `packages/features/src/listing/components/ReviewStep.tsx`

All new props optional; when absent (sale flow) the component renders exactly as today.

- [ ] **Step 1: Extend the props and add the new sections**

New imports:

```tsx
import { Button } from '@mzanzihomes/ui/components/button';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Input } from '@mzanzihomes/ui/components/input';
import { AlertTriangle, Pencil, ShieldCheck, XCircle } from 'lucide-react';
import { isValidSaPhone, type PublishChecklist } from '../validation';
```

New props:

```tsx
interface ReviewStepProps {
  formData: ListingFormData | SaleListingFormData;
  isSale?: boolean;
  // Rent-wizard extras (all optional — sale flow renders as before):
  onEdit?: (step: number) => void;
  checklist?: PublishChecklist;
  declaration?: { checked: boolean; onChange: (v: boolean) => void };
  contact?: { phone: string | null; saving: boolean; onSavePhone: (phone: string) => void };
}
```

Wizard step numbers for the Edit buttons: 1 Property Type, 2 Location/Description, 3 Details, 4 Pricing, 5 Photos.

Add a small helper inside the component:

```tsx
const EditBtn = ({ step }: { step: number }) =>
  onEdit ? (
    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onEdit(step)}>
      <Pencil className="h-3 w-3 mr-1" /> Edit
    </Button>
  ) : null;
```

**Checklist card** — render at the top (right after the heading) when `checklist` is provided and has content:

```tsx
{checklist && (checklist.blockers.length > 0 || checklist.warnings.length > 0) && (
  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">Before you publish</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {checklist.blockers.map((b) => (
        <p key={b} className="flex items-start gap-2 text-sm text-destructive">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {b}
        </p>
      ))}
      {checklist.warnings.map((w) => (
        <p key={w} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {w}
        </p>
      ))}
    </CardContent>
  </Card>
)}
```

**Edit buttons** — add `<EditBtn step={N} />` beside each existing section header:
- Preview card: overlay button top-left of the image area → `<EditBtn step={5} />` for photos (place in a `absolute top-4 left-4` wrapper).
- "Property Details" CardTitle row → wrap title + `<EditBtn step={3} />` in `flex items-center justify-between`. Add a "Type" edit → step 1 (a second small edit next to the Type row is overkill; put `<EditBtn step={1} />` next to the Type value).
- "Pricing & Availability" CardTitle row → `<EditBtn step={4} />`.
- "Description" CardTitle row → `<EditBtn step={2} />`.
- Add a new **Address** card (rent flow only — render when `!isSale`) between the preview card and the details grid:

```tsx
{!isSale && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Address
        </CardTitle>
        <EditBtn step={2} />
      </div>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">
      {(formData as ListingFormData).street_address ? <p>{(formData as ListingFormData).street_address}</p> : null}
      <p>
        {[(formData as ListingFormData).suburb, (formData as ListingFormData).city, (formData as ListingFormData).province]
          .filter(Boolean)
          .join(', ')}{' '}
        {(formData as ListingFormData).postal_code}
      </p>
    </CardContent>
  </Card>
)}
```

**Contact check** — render before the declaration when `contact` is provided and phone is missing/invalid:

```tsx
{contact && !isValidSaPhone(contact.phone || '') && (
  <Card className="border-destructive/40">
    <CardContent className="p-5 space-y-3">
      <p className="text-sm font-medium">Add a phone number to your profile before publishing.</p>
      <PhoneSaver saving={contact.saving} onSave={contact.onSavePhone} />
    </CardContent>
  </Card>
)}
```

With this small component in the same file:

```tsx
function PhoneSaver({ saving, onSave }: { saving: boolean; onSave: (phone: string) => void }) {
  const [phone, setPhone] = React.useState('');
  const valid = isValidSaPhone(phone);
  return (
    <div className="flex gap-2">
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        inputMode="tel"
        placeholder="082 123 4567"
        className="text-base"
      />
      <Button type="button" disabled={!valid || saving} onClick={() => onSave(phone)}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}
```

**Declaration** — render at the bottom when `declaration` is provided:

```tsx
{declaration && (
  <Card>
    <CardContent className="p-5 flex items-start gap-3">
      <Checkbox
        id="landlord-declaration"
        checked={declaration.checked}
        onCheckedChange={(v) => declaration.onChange(!!v)}
        className="mt-0.5"
      />
      <Label htmlFor="landlord-declaration" className="text-sm font-normal leading-relaxed cursor-pointer">
        <ShieldCheck className="h-4 w-4 inline mr-1 text-primary" />
        I confirm that the information provided is accurate and that I am authorised to advertise this property.
      </Label>
    </CardContent>
  </Card>
)}
```

(Import `Label` from `@mzanzihomes/ui/components/label`.)

- [ ] **Step 2: Verify typecheck baseline**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → `14`.
`ListSale.tsx` passes none of the new props → unchanged rendering.

- [ ] **Step 3: Commit**

```bash
git add packages/features/src/listing/components/ReviewStep.tsx
git commit -m "feat: review checklist, per-section edit, declaration and contact check"
```

---

### Task 10: ListProperty.tsx — wire it all together

**Files:**
- Modify: `apps/landlord/src/pages/ListProperty.tsx` (substantial rewrite; file keeps `// @ts-nocheck`)

Key changes (the file keeps its overall structure — header, progress, step content card, nav buttons, dialogs):

- [ ] **Step 1: Replace draft/localStorage plumbing with useListingDraft**

New imports:

```tsx
import { useListingDraft, SaveStatusIndicator, deriveResumeStep } from '@mzanzihomes/features/listing';
import { composeLocation, buildPublishChecklist, MIN_PHOTOS } from '@mzanzihomes/features/listing';
import { useQuery, useQueryClient } from '@tanstack/react-query';
```

Add default values for the new fields in `DEFAULT_FORM_VALUES`:

```tsx
street_address: '',
suburb: '',
city: '',
province: '',
postal_code: '',
bathrooms_confirmed: false,
```

Instantiate the hook and profile query after `useExistingProperty`:

```tsx
const { propertyId, property: existingProperty } = useExistingProperty();
const draft = useListingDraft({ userId: user?.id, existingPropertyId: propertyId });

const queryClient = useQueryClient();
const { data: profile } = useQuery({
  queryKey: ['listing-profile-phone', user?.id],
  enabled: !!user,
  queryFn: async () => {
    const { data } = await supabase.from('profiles').select('phone').eq('user_id', user!.id).maybeSingle();
    return data;
  },
});
const [savingPhone, setSavingPhone] = useState(false);
const savePhone = async (phone: string) => {
  setSavingPhone(true);
  try {
    await supabase.from('profiles').update({ phone }).eq('user_id', user!.id);
    await queryClient.invalidateQueries({ queryKey: ['listing-profile-phone', user!.id] });
  } finally {
    setSavingPhone(false);
  }
};
```

**Delete** the whole `LOCAL_STORAGE_KEY` restore effect, the persist effect, and `handleStartOver`'s localStorage line. On mount, clear the legacy key once:

```tsx
useEffect(() => {
  try {
    localStorage.removeItem('listing_form_draft');
  } catch {}
}, []);
```

Form → row mapping (module scope, above the component):

```tsx
const toRow = (d) => ({
  property_type: d.property_type || '',
  street_address: d.street_address?.trim() || null,
  suburb: d.suburb?.trim() || null,
  city: d.city?.trim() || null,
  province: d.province || null,
  postal_code: d.postal_code?.trim() || null,
  location: composeLocation(d),
  title: d.property_type ? `${d.property_type} in ${d.suburb || d.city || composeLocation(d) || 'South Africa'}` : '',
  description: d.description || '',
  bedrooms: Number(d.bedrooms) || 0,
  bathrooms: Number(d.bathrooms) || 0,
  parking_spaces: Number(d.parking_spaces) || 0,
  size_sqm: d.size_sqm ? Number(d.size_sqm) : null,
  furnished: !!d.furnished,
  pets_allowed: !!d.pets_allowed,
  amenities: d.amenities || [],
  price: Number(d.price) || 0,
  available_from: d.available_from || null,
  images: (d.images || []).filter((i) => typeof i === 'string'),
});
```

Autosave subscription (debounced by the hook; only once a draft exists):

```tsx
useEffect(() => {
  const sub = watch((value) => {
    if (draft.draftId) draft.save(toRow(value));
  });
  return () => sub.unsubscribe();
}, [watch, draft.draftId, draft.save]);
```

Row → form loader (module scope) used by both existing-property load and resume:

```tsx
const rowToForm = (p) => ({
  property_type: p.property_type || '',
  location: p.location || '',
  description: p.description || '',
  bedrooms: p.bedrooms ?? undefined,
  bathrooms: p.bathrooms > 0 ? p.bathrooms : undefined,
  parking_spaces: p.parking_spaces ?? undefined,
  size_sqm: p.size_sqm ?? undefined,
  furnished: !!p.furnished,
  pets_allowed: !!p.pets_allowed,
  amenities: p.amenities || [],
  price: p.price > 0 ? p.price : undefined,
  available_from: p.available_from ?? undefined,
  images: p.images || [],
  street_address: p.street_address || '',
  suburb: p.suburb || '',
  city: p.city || '',
  province: p.province || '',
  postal_code: p.postal_code || '',
  bathrooms_confirmed: false,
});
```

Replace the existing `existingProperty` reset effect body with `reset(rowToForm(existingProperty));`.

Resume prompt (replaces the old localStorage AlertDialog wiring — keep the AlertDialog component):

```tsx
const resumeStep = draft.resumeDraft ? deriveResumeStep(draft.resumeDraft) : 1;
const handleResume = () => {
  const row = draft.resumeDraft;
  draft.adoptDraft(row);
  reset(rowToForm(row));
  const stored = Number(localStorage.getItem(`listing_step_${row.id}`) || 0);
  setCurrentStep(Math.min(Math.max(deriveResumeStep(row), stored || 1), steps.length));
};
```

AlertDialog becomes:

```tsx
<AlertDialog open={!!draft.resumeDraft} onOpenChange={(o) => { if (!o) draft.dismissResume(); }}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Continue where you left off?</AlertDialogTitle>
      <AlertDialogDescription>
        You have an unfinished {draft.resumeDraft?.property_type || 'property'} listing
        {draft.resumeDraft?.suburb ? ` in ${draft.resumeDraft.suburb}` : ''}. Pick up where you
        stopped, or start a new listing — your draft stays saved either way.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={draft.dismissResume}>Start a new listing</AlertDialogCancel>
      <AlertDialogAction onClick={handleResume}>Continue where you left off</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Persist the step position per draft:

```tsx
useEffect(() => {
  if (draft.draftId) {
    try { localStorage.setItem(`listing_step_${draft.draftId}`, String(currentStep)); } catch {}
  }
}, [currentStep, draft.draftId]);
```

- [ ] **Step 2: Step navigation — create draft on step 1, save on every step, return-to-review**

```tsx
const [returnToReview, setReturnToReview] = useState(false);

const nextStep = async () => {
  let fieldsToValidate = [];
  switch (currentStep) {
    case 1: fieldsToValidate = ['property_type']; break;
    case 2: fieldsToValidate = ['suburb', 'city', 'province', 'postal_code', 'description']; break;
    case 3: fieldsToValidate = ['bedrooms', 'bathrooms']; break;
    case 4: fieldsToValidate = ['price']; break;
  }
  const isValid = await trigger(fieldsToValidate);
  if (!isValid) return;

  if (currentStep === 1) {
    const id = await draft.ensureDraft(toRow(watch()));
    if (!id) {
      toast({ variant: 'destructive', title: "Couldn't save your draft", description: 'Please check your connection and try again.' });
      return;
    }
  } else {
    draft.save(toRow(watch()));
  }

  if (returnToReview && currentStep < steps.length) {
    setReturnToReview(false);
    setCurrentStep(steps.length);
  } else if (currentStep < steps.length) {
    setCurrentStep(currentStep + 1);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const editFromReview = (step) => {
  setReturnToReview(true);
  setCurrentStep(step);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

(Photos step has no validated fields; Continue from step 5 goes straight to 6 through the same path.)

- [ ] **Step 3: Wire the steps**

```tsx
const [declarationChecked, setDeclarationChecked] = useState(false);
const checklist = buildPublishChecklist(formData, profile?.phone ?? null);

const renderStepContent = () => {
  switch (currentStep) {
    case 1: return <PropertyTypeStep control={control} errors={errors} />;
    case 2: return <LocationStep control={control} errors={errors} watch={watch} setValue={setValue} structuredAddress />;
    case 3: return <DetailsStep control={control} errors={errors} setValue={setValue} watch={watch} />;
    case 4: return <PricingStep control={control} errors={errors} setValue={setValue} watch={watch} />;
    case 5: return (
      <PhotosStep
        setValue={setValue}
        formData={formData}
        upload={{ userId: user.id, onSaved: (urls) => { if (draft.draftId) draft.save({ images: urls }); } }}
      />
    );
    case 6: return (
      <ReviewStep
        formData={formData}
        onEdit={editFromReview}
        checklist={checklist}
        declaration={{ checked: declarationChecked, onChange: setDeclarationChecked }}
        contact={{ phone: profile?.phone ?? null, saving: savingPhone, onSavePhone: savePhone }}
      />
    );
    default: return null;
  }
};
```

Header gains the indicator (next to the h1):

```tsx
<div className="flex items-center gap-3">
  <h1 className="text-2xl sm:text-3xl font-bold text-primary">List Your Property</h1>
  <SaveStatusIndicator state={draft.saveState} lastSavedAt={draft.lastSavedAt} />
</div>
```

- [ ] **Step 4: Staged publish**

Replace `isSubmitting` with a stage, delete `uploadImages` (photos are already URLs), and rewrite `onSubmit`:

```tsx
const [publishStage, setPublishStage] = useState(null); // null | 'verifying' | 'finalising' | 'publishing'

const stageLabel = {
  verifying: 'Verifying information…',
  finalising: 'Finalising listing…',
  publishing: 'Publishing to MzanziHomes…',
};

const onSubmit = async (data) => {
  if (!declarationChecked || checklist.blockers.length > 0) return;
  setPublishStage('verifying');
  try {
    if (!isLandlord) {
      const { error: roleError } = await supabase.rpc('promote_to_landlord');
      if (roleError) console.error('Error promoting to landlord:', roleError);
    }

    const row = toRow(data);
    if (row.images.length < MIN_PHOTOS) throw new Error(`Add at least ${MIN_PHOTOS} photos before publishing.`);

    setPublishStage('finalising');
    let id = draft.draftId;
    if (id) {
      const { error } = await supabase.from('properties').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { data: created, error } = await supabase
        .from('properties')
        .insert({ ...row, landlord_id: user.id, is_listed: false })
        .select('id')
        .single();
      if (error) throw error;
      id = created.id;
    }

    setPublishStage('publishing');
    const { error: publishErr } = await supabase.from('properties').update({ is_listed: true }).eq('id', id);
    if (publishErr) {
      if (publishErr.message?.includes('PUBLISH_PAYWALL')) {
        setPaywallPropertyId(id);
        setShowPaywall(true);
        return;
      }
      throw publishErr;
    }

    try { localStorage.removeItem(`listing_step_${id}`); } catch {}
    setShowSuccessDialog(true);
  } catch (error) {
    toast({ variant: 'destructive', title: 'Error listing property', description: error.message });
  } finally {
    setPublishStage(null);
  }
};
```

Publish button:

```tsx
<Button
  onClick={handlePublishClick}
  disabled={publishStage !== null || !declarationChecked || checklist.blockers.length > 0}
  className="flex items-center gap-2"
>
  {publishStage ? stageLabel[publishStage] : 'Publish Property'}
  <CheckCircle className="h-4 w-4" />
</Button>
```

Keep: success dialog, paywall sheet (unchanged), `handlePublishClick = handleSubmit(onSubmit)`.

- [ ] **Step 5: Verify typecheck + tests**

Run: `cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"` → `14`.
Run: `cd packages/features && npx vitest run` → all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/landlord/src/pages/ListProperty.tsx
git commit -m "feat: wire listing wizard to server drafts, checklist, declaration and staged publish"
```

---

### Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: All typecheck baselines**

```bash
cd apps/landlord && npx tsc --build --force 2>&1 | grep -c "error TS"   # expect 14
cd ../web && npx tsc --build --force 2>&1 | grep -c "error TS"          # expect 12
cd ../tenant && npx tsc --build --force 2>&1 | grep -c "error TS"       # expect 19
```

- [ ] **Step 2: All package tests**

```bash
cd packages/features && npx vitest run
cd ../common && npx vitest run
```

Expected: PASS.

- [ ] **Step 3: Manual smoke on the landlord dev server (port 8082, mobile viewport 390×844)**

Use Playwright MCP against `http://localhost:8082/list-property` (the dev server should already be running; start with `npm run dev` in `apps/landlord` if not). Verify visually:

1. Step 1 shows grouped SA property types; selecting Other reveals the custom input; Continue creates a draft ("Saved just now" appears top-right).
2. Step 2 shows the structured address form; province dropdown lists 9 provinces; a 3-digit postcode blocks Continue with an inline error; description under 150 chars shows the amber warning + char count.
3. Step 3: set bedrooms 2, bathrooms 6 → amber confirm appears; Continue blocked until ticked.
4. Step 4: price 1500 shows the "unusually low" amber warning but does not block.
5. Step 5: adding photos shows uploading tiles then Cover badge on the first; drag reorder works; "N of 10 recommended" updates; fewer than 5 shows the amber minimum note.
6. Step 6: checklist shows blockers/warnings; Edit buttons jump to the right step and Continue returns to Review; Publish stays disabled until declaration ticked and blockers cleared; publish shows staged labels then the success dialog (or paywall).
7. Reload mid-wizard → "Continue where you left off?" prompt restores data and step.
8. Sale flow sanity: open `/list-sale` and confirm the steps render (legacy photos UI, legacy single-location field).

- [ ] **Step 4: Push the branch**

```bash
git push -u origin feat/listing-flow-ux
```

---

## Self-review notes (already applied)

- Spec coverage: §1 → Task 1; §2 → Task 5; §3 → Tasks 3, 4, 10; §4 → Task 8; §5 → Tasks 2, 6, 7, 9, 10; §6 → Tasks 9, 10; §7 → all; testing → Tasks 2, 3, 11.
- Type consistency: `buildPublishChecklist(data, profilePhone)` (Tasks 2, 9, 10), `useListingDraft` return shape (Tasks 4, 10), `PhotosStep` `upload` prop (Tasks 8, 10), `ReviewStep` props (Tasks 9, 10), `structuredAddress` prop (Tasks 6, 10) — all match.
- The spec's "useListingDraft state transition tests" are covered by testing the extracted pure logic (`draftLogic.ts`) instead: the hook itself imports the supabase client (env-dependent), so its pure parts were extracted precisely to keep tests hermetic.

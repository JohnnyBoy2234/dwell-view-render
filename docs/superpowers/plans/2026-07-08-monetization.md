# Monetization (Plan 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two-tier landlord monetization — R149/month subscription unlocks everything; R99 once-off per-listing fee publishes a listing with contact-only leads — enforced by a publish paywall in the database, Paystack Plans + webhooks, gated dashboard tiles, and a post-sign-in plan prompt; Callpay/PayFast billing is retired.

**Architecture:** A single migration adds `listing_payments`, entitlement functions (`is_active_subscriber`, `can_publish_property`), a `BEFORE INSERT/UPDATE` trigger on `properties.is_listed` that raises `PUBLISH_PAYWALL` when publishing without entitlement, and a `get_property_contact_mode` RPC. A new `initialize-plan-checkout` edge function starts Paystack checkout for either purpose; the existing `paystack-webhook` gains a `LISTING_` branch and subscription-event handlers that sync `profiles.plan`. Client side: `useSubscription` becomes two-tier, dashboard tiles stay visible but click-gated for free landlords, a plan prompt appears once after sign-in, publish attempts catch `PUBLISH_PAYWALL` and open a paywall sheet, and tenants contacting a free landlord's paid listing go through a lead flow instead of messaging.

**Tech Stack:** Supabase (Postgres, RLS, Edge Functions/Deno), Paystack (Transactions + Plans + Subscriptions, ZAR), React + Vite monorepo (`apps/landlord`, `apps/tenant`, `apps/web`, `packages/*`), Vitest.

**Money:** R99 = `9900` cents, R149 = `14900` cents, currency `ZAR`. Paystack amounts are always in cents.

**UX decisions locked with the user (2026-07-08):**
1. After a landlord signs in, they are prompted with the plans (subscription R149/month vs pay-per-listing R99) — once per session, dismissible.
2. The dashboard always shows **all** management tool tiles; clicking a gated tile as a non-subscriber opens a subscribe prompt instead of the tool.
3. Adding/publishing a property shows the subscription/listing-fee choice (publish paywall).
4. Free tiles (never gated): **List Property**, **My Profile**, **Support**. Everything else (Messages, Applications, Maintenance, Payments, Rent collection, SwiftBooks, Leases, Inventory, Inspection, Invite Tenant) requires the subscription.

**Security constraints (non-negotiable):**
- No secret values (service-role key, `sk_live`/`sk_test`, `re_`, `eyJ` JWTs) in any committed file, including the migration. Edge functions read secrets from `Deno.env`.
- The migration file is committed; apply it to the remote project via MCP `apply_migration`.

**Repo root:** `C:\Users\Jonathan D Theron\dwell-view-render`. All paths below are relative to it. Work happens on a feature branch (e.g. `feat/monetization`), not `main`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260708100000_monetization.sql` | Create | listing_payments, entitlement fns, publish trigger, contact-mode RPC, plan mapping, RESTRICTIVE conversations policy |
| `packages/common/src/utils/planAccess.ts` | Create | Pure plan normalization + active-subscriber logic (client-side mirror of SQL) |
| `packages/common/src/utils/planAccess.test.ts` | Create | Vitest tests for planAccess |
| `packages/supabase/src/hooks/useSubscription.tsx` | Rewrite | Two-tier plan state (`free`/`subscriber`) with legacy aliases |
| `supabase/functions/initialize-plan-checkout/index.ts` | Create | Paystack checkout init for `listing_fee` and `subscription` purposes |
| `supabase/functions/paystack-webhook/index.ts` | Modify | `LISTING_` charge branch + subscription lifecycle events |
| `packages/features/src/billing/hooks/usePlanCheckout.ts` | Create | Client helper invoking initialize-plan-checkout + redirect |
| `packages/features/src/billing/components/PublishPaywallSheet.tsx` | Create | Two-option paywall sheet shown on publish attempt |
| `packages/features/src/billing/index.ts` | Modify | Export new component + hook |
| `apps/landlord/src/components/PlanPromptSheet.tsx` | Create | Post-sign-in plans prompt (once per session) |
| `apps/landlord/src/components/SubscribeGateDialog.tsx` | Create | Tile-click subscribe prompt |
| `apps/landlord/src/pages/EnhancedLandlordDashboard.tsx` | Modify | Mount PlanPromptSheet; gate tiles in `onToolClick` |
| `apps/landlord/src/pages/ListProperty.tsx` | Modify | Insert unlisted, attempt publish, catch paywall |
| `apps/landlord/src/pages/ListSale.tsx` | Modify | Same publish treatment |
| `apps/landlord/src/pages/PlanSuccess.tsx` | Create | Post-checkout landing page |
| `apps/landlord/src/App.tsx` | Modify | Route for /plan-success; PlanGuard values normalized |
| `supabase/functions/submit-property-lead/index.ts` | Create | Lead capture for free-landlord listings (notification + email) |
| `packages/features/src/messaging/components/LeadContactDialog.tsx` | Create | Tenant-facing lead form dialog |
| `packages/features/src/messaging/components/StartConversation.tsx` | Modify | Contact-mode check → lead flow for free landlords |
| `packages/ui/src/components/PlanGuard.tsx` | Rewrite | Re-enable route gating against subscriber tier |
| `packages/ui/src/components/subscription/UpgradePrompt.tsx` | Rewrite | Two-tier upsell, launches checkout directly |
| `apps/web/src/pages/Pricing.tsx` | Rewrite | Two-tier pricing page (no Callpay) |
| `apps/web/src/services/callpayService.ts` | Delete | Callpay retirement |
| `supabase/functions/callpay-initiate`, `callpay-webhook`, `callpay-test`, `activate-subscription` | Delete | Callpay retirement |

---

### Task 1: Database migration — entitlements, paywall trigger, lead RPC

**Files:**
- Create: `supabase/migrations/20260708100000_monetization.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Monetization: two-tier plans (free / subscriber), publish paywall, listing fees, lead contact mode.

-- 1) Once-off listing-fee payments. One payment publishes one property forever.
CREATE TABLE IF NOT EXISTS public.listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL,
  amount numeric NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords can view own listing payments"
  ON public.listing_payments FOR SELECT
  USING (auth.uid() = landlord_id);
-- No INSERT/UPDATE/DELETE policies: only the service role (webhook) writes.

-- 2) Paystack subscription linkage on the existing billing_subscriptions table.
ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS paystack_customer_code text,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code text;

-- 3) Entitlement functions.
CREATE OR REPLACE FUNCTION public.is_active_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND plan = 'subscriber'
      AND COALESCE(plan_status, 'active') IN ('active','trialing','past_due','non-renewing')
      AND (plan_expires_at IS NULL OR plan_expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_property(_property_id uuid, _landlord_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_subscriber(_landlord_id)
      OR EXISTS (SELECT 1 FROM public.listing_payments WHERE property_id = _property_id);
$$;

-- 4) Publish paywall trigger. Fires only on the false->true transition (or INSERT with true),
--    so properties that are already listed today are grandfathered and stay live.
--    The webhook inserts the listing_payments row BEFORE flipping is_listed, so the
--    service-role publish passes this check naturally.
CREATE OR REPLACE FUNCTION public.enforce_publish_paywall()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_listed IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_listed IS DISTINCT FROM TRUE) THEN
    IF NOT public.can_publish_property(NEW.id, NEW.landlord_id) THEN
      RAISE EXCEPTION 'PUBLISH_PAYWALL: publishing requires an active subscription or a once-off listing fee';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_publish_paywall ON public.properties;
CREATE TRIGGER trg_enforce_publish_paywall
  BEFORE INSERT OR UPDATE OF is_listed ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_paywall();

-- New properties are drafts until paid/subscribed.
ALTER TABLE public.properties ALTER COLUMN is_listed SET DEFAULT false;

-- 5) Collapse legacy pro/premium into subscriber.
UPDATE public.profiles SET plan = 'subscriber' WHERE plan IN ('pro','premium');

-- 6) Replace the trigger fn that syncs profiles.plan from billing_subscriptions:
--    any active-ish subscription now maps to 'subscriber' regardless of plan_code.
CREATE OR REPLACE FUNCTION public.update_profile_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('active','trialing','past_due','non-renewing') THEN
    UPDATE public.profiles
    SET plan = 'subscriber',
        plan_status = NEW.status,
        plan_expires_at = COALESCE(NEW.current_period_end, NEW.trial_end),
        plan_last_synced = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET plan = 'free',
        plan_status = NEW.status,
        plan_last_synced = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7) Keep the legacy RLS helper consistent with the new tiers.
--    (Defined in 20251121120000_add_subscription_rls_policies.sql; level 2 satisfied
--    both the old 'pro' (1) and 'premium' (2) policies.)
CREATE OR REPLACE FUNCTION public.get_user_plan_level(user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_active_subscriber(user_id) THEN 2 ELSE 0 END;
$$;

-- 8) New conversations may only be created with subscribed landlords.
--    RESTRICTIVE: AND-ed with every existing permissive INSERT policy.
--    Existing conversations/messages are untouched, so lapsed landlords keep old threads.
DROP POLICY IF EXISTS "subscriber_landlord_new_conversations" ON public.conversations;
CREATE POLICY "subscriber_landlord_new_conversations"
  ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_subscriber(landlord_id));

-- 9) Contact mode for a listing: 'messaging' (subscriber landlord) or 'lead' (free landlord).
--    Callable by anon + authenticated so the tenant app can branch before contact.
CREATE OR REPLACE FUNCTION public.get_property_contact_mode(_property_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_active_subscriber(p.landlord_id) THEN 'messaging' ELSE 'lead' END
  FROM public.properties p
  WHERE p.id = _property_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_contact_mode(uuid) TO anon, authenticated;
```

**Important pre-check:** before finalizing, open `supabase/migrations/20251121120000_add_subscription_rls_policies.sql` and confirm the exact signature of `get_user_plan_level` (parameter name and return type). If it differs from `(user_id uuid) RETURNS integer`, match the existing signature exactly — `CREATE OR REPLACE` fails on signature mismatch (it would create an overload instead of replacing). Same check for `update_profile_plan_from_subscription` column names (`current_period_end`, `trial_end`, `user_id`) against `20251204183000_add_profile_plan_fields.sql` and `20251004120000_billing_payfast.sql`; adjust `COALESCE` fields to the columns that actually exist.

- [ ] **Step 2: Apply to the remote project**

Apply via MCP: `mcp__plugin_supabase_supabase__apply_migration` with `project_id: rsfrvjaqxhoqavvscvwf`, `name: monetization`, and the file's SQL as `query`.
Expected: success, no errors.

- [ ] **Step 3: Smoke-test in SQL**

Run via MCP `execute_sql`:

```sql
SELECT public.is_active_subscriber('00000000-0000-0000-0000-000000000000') AS sub,  -- false
       public.get_user_plan_level('00000000-0000-0000-0000-000000000000') AS lvl;   -- 0
```

Expected: `sub = false`, `lvl = 0`. Then verify the trigger blocks an unpaid publish (pick any real property id `X` owned by landlord `L` with `is_listed = false` and `plan = 'free'`):

```sql
UPDATE public.properties SET is_listed = true WHERE id = 'X';
```

Expected: ERROR containing `PUBLISH_PAYWALL`. (If every existing property is listed/grandfathered, skip this check — Task 14's end-to-end run covers it.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260708100000_monetization.sql
git commit -m "feat(db): publish paywall, listing_payments, two-tier plan entitlements"
```

---

### Task 2: `planAccess` utility (TDD)

**Files:**
- Create: `packages/common/src/utils/planAccess.ts`
- Test: `packages/common/src/utils/planAccess.test.ts` (colocated, same pattern as `billingCycle.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
// packages/common/src/utils/planAccess.test.ts
import { describe, it, expect } from 'vitest';
import { normalizePlan, isActiveSubscriber } from './planAccess';

describe('normalizePlan', () => {
  it('maps legacy pro/premium to subscriber', () => {
    expect(normalizePlan('pro')).toBe('subscriber');
    expect(normalizePlan('premium')).toBe('subscriber');
    expect(normalizePlan('Premium')).toBe('subscriber');
  });
  it('keeps subscriber as subscriber', () => {
    expect(normalizePlan('subscriber')).toBe('subscriber');
  });
  it('maps everything else to free', () => {
    expect(normalizePlan('free')).toBe('free');
    expect(normalizePlan(null)).toBe('free');
    expect(normalizePlan(undefined)).toBe('free');
    expect(normalizePlan('basic')).toBe('free');
  });
});

describe('isActiveSubscriber', () => {
  it('is false for free plans regardless of status', () => {
    expect(isActiveSubscriber({ plan: 'free', planStatus: 'active' })).toBe(false);
  });
  it('is true for subscriber with active-ish statuses', () => {
    for (const s of ['active', 'trialing', 'past_due', 'non-renewing']) {
      expect(isActiveSubscriber({ plan: 'subscriber', planStatus: s })).toBe(true);
    }
  });
  it('treats missing status as active', () => {
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: null })).toBe(true);
  });
  it('is false for cancelled/lapsed statuses', () => {
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'cancelled' })).toBe(false);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'lapsed' })).toBe(false);
  });
  it('is false when expiry is in the past, true when in the future or null', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: past })).toBe(false);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: future })).toBe(true);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: null })).toBe(true);
  });
  it('accepts legacy pro/premium as subscriber', () => {
    expect(isActiveSubscriber({ plan: 'premium', planStatus: 'active' })).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run (from repo root): `npm run test -- planAccess`
Expected: FAIL — cannot resolve `./planAccess`.

- [ ] **Step 3: Implement**

```ts
// packages/common/src/utils/planAccess.ts
// Client-side mirror of the SQL entitlement logic in is_active_subscriber().
// Keep the two in lockstep: same status set, same expiry rule.

export type NormalizedPlan = 'free' | 'subscriber';

export const SUBSCRIPTION_PRICE_CENTS = 14900; // R149/month
export const LISTING_FEE_CENTS = 9900; // R99 once-off per listing

const SUBSCRIBER_PLANS = new Set(['subscriber', 'pro', 'premium']);
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'non-renewing']);

export function normalizePlan(plan: string | null | undefined): NormalizedPlan {
  return plan && SUBSCRIBER_PLANS.has(plan.toLowerCase()) ? 'subscriber' : 'free';
}

export interface PlanState {
  plan?: string | null;
  planStatus?: string | null;
  planExpiresAt?: string | Date | null;
}

export function isActiveSubscriber({ plan, planStatus, planExpiresAt }: PlanState): boolean {
  if (normalizePlan(plan) !== 'subscriber') return false;
  const status = (planStatus ?? 'active').toLowerCase();
  if (!ACTIVE_STATUSES.has(status)) return false;
  if (planExpiresAt) {
    const exp = new Date(planExpiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= Date.now()) return false;
  }
  return true;
}
```

If `packages/common/src/utils` has an `index.ts` barrel, add `export * from './planAccess';` to it (check first — `billingCycle` will show the pattern).

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test -- planAccess`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/common/src/utils/planAccess.ts packages/common/src/utils/planAccess.test.ts
git commit -m "feat(common): planAccess two-tier entitlement helpers"
```

---

### Task 3: Rewrite `useSubscription` to two tiers

**Files:**
- Modify (rewrite body, keep existing client/type imports): `packages/supabase/src/hooks/useSubscription.tsx`

- [ ] **Step 1: Read the current file** and note: the supabase client import path, the realtime channel setup on `profiles` and `billing_subscriptions`, and every exported name (other files import `PlanType`, `isFreePlan`, `isProPlan`, `isPremiumPlan`, `hasAccess`, `refresh`). The rewrite must keep all existing export names working (as deprecated aliases) so consumers compile before Tasks 8/11/12 update them.

- [ ] **Step 2: Rewrite the hook**

Replace the plan-derivation logic with `planAccess`, keeping the same data sources (profiles row by `user_id`, fallback to `billing_subscriptions`) and the same realtime invalidation:

```tsx
// Shape of the rewritten hook (keep the file's existing imports for supabase client).
import { normalizePlan, isActiveSubscriber, type NormalizedPlan } from '@mzanzihomes/common/utils/planAccess';

/** @deprecated legacy tier names — normalized to 'free' | 'subscriber' internally */
export type PlanType = 'free' | 'pro' | 'premium' | 'subscriber';

export function useSubscription() {
  // ... existing state + fetch of profiles (plan, plan_status, plan_expires_at, plan_last_synced)
  // and billing_subscriptions fallback, existing realtime channels — unchanged.

  const plan: NormalizedPlan = normalizePlan(profileRow?.plan);
  const isSubscriber = isActiveSubscriber({
    plan: profileRow?.plan,
    planStatus: profileRow?.plan_status,
    planExpiresAt: profileRow?.plan_expires_at,
  });

  return {
    plan,                 // 'free' | 'subscriber'
    isSubscriber,         // the one flag the app should use
    planStatus: profileRow?.plan_status ?? null,
    planExpiresAt: profileRow?.plan_expires_at ?? null,
    loading,
    refresh,
    // ── deprecated aliases (keep names until all consumers migrate) ──
    isFreePlan: !isSubscriber,
    isProPlan: isSubscriber,
    isPremiumPlan: isSubscriber,
    hasAccess: (_required: PlanType) => _required === 'free' || isSubscriber,
  };
}
```

The `// ... existing` parts are the file's current fetch/realtime code — keep them verbatim; only the derivation and the returned object change.

- [ ] **Step 3: Typecheck all consumers**

```bash
cd apps/landlord && npx tsc --noEmit
cd ../tenant && npx tsc --noEmit
cd ../web && npx tsc --noEmit
```

Expected: PASS (aliases keep old call sites compiling).

- [ ] **Step 4: Commit**

```bash
git add packages/supabase/src/hooks/useSubscription.tsx
git commit -m "refactor(supabase): two-tier useSubscription with legacy aliases"
```

---

### Task 4: `initialize-plan-checkout` edge function

**Files:**
- Create: `supabase/functions/initialize-plan-checkout/index.ts`

- [ ] **Step 1: Write the function** (modeled on `supabase/functions/pay-monthly-bill/index.ts` — copy its CORS headers and auth pattern verbatim):

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBSCRIPTION_PRICE_CENTS = 14900; // R149/month
const LISTING_FEE_CENTS = 9900; // R99 once-off
const PLAN_NAME = "MzanziHomes Landlord Subscription";

const logStep = (step: string, details?: unknown) =>
  console.log(`[INITIALIZE-PLAN-CHECKOUT] ${step}`, details ?? "");

async function paystack(path: string, secretKey: string, init?: RequestInit) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new Error(`Paystack ${path} failed: ${body.message ?? res.status}`);
  }
  return body;
}

// Find-or-create the R149/month ZAR plan so we never hardcode a plan code.
async function ensurePlan(secretKey: string): Promise<string> {
  const list = await paystack(`/plan?interval=monthly&amount=${SUBSCRIPTION_PRICE_CENTS}`, secretKey);
  const existing = (list.data ?? []).find((p: any) => p.name === PLAN_NAME && p.currency === "ZAR");
  if (existing) return existing.plan_code;
  const created = await paystack("/plan", secretKey, {
    method: "POST",
    body: JSON.stringify({
      name: PLAN_NAME,
      interval: "monthly",
      amount: SUBSCRIPTION_PRICE_CENTS,
      currency: "ZAR",
    }),
  });
  return created.data.plan_code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user?.email) throw new Error("Not authenticated");

    const { purpose, property_id } = await req.json();
    if (purpose !== "listing_fee" && purpose !== "subscription") {
      throw new Error("purpose must be 'listing_fee' or 'subscription'");
    }
    if (purpose === "listing_fee" && !property_id) {
      throw new Error("property_id is required for listing_fee");
    }

    // Listing fee: verify the property belongs to this landlord and isn't already paid.
    if (purpose === "listing_fee") {
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, landlord_id")
        .eq("id", property_id)
        .single();
      if (propErr || !prop) throw new Error("Property not found");
      if (prop.landlord_id !== user.id) throw new Error("Not your property");
      const { data: paid } = await supabase
        .from("listing_payments")
        .select("id")
        .eq("property_id", property_id)
        .maybeSingle();
      if (paid) throw new Error("This listing is already paid for");
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const amount = purpose === "subscription" ? SUBSCRIPTION_PRICE_CENTS : LISTING_FEE_CENTS;
    const reference = purpose === "subscription"
      ? `SUB_${user.id.slice(0, 8)}_${Date.now()}`
      : `LISTING_${property_id}_${Date.now()}`;

    const initBody: Record<string, unknown> = {
      email: user.email,
      amount,
      currency: "ZAR",
      reference,
      callback_url: `${origin}/plan-success${property_id ? `?property=${property_id}` : ""}`,
      metadata: {
        purpose,
        landlord_id: user.id,
        ...(property_id ? { property_id } : {}),
      },
    };
    if (purpose === "subscription") {
      initBody.plan = await ensurePlan(secretKey); // Paystack creates the subscription on charge
    }

    logStep("Initializing", { purpose, reference, amount });
    const init = await paystack("/transaction/initialize", secretKey, {
      method: "POST",
      body: JSON.stringify(initBody),
    });

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: init.data.authorization_url,
        reference,
        amount,
        test_mode: secretKey.startsWith("sk_test"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    logStep("ERROR", { message: (e as Error).message });
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

Before finalizing, diff the CORS headers, std/server version, and supabase-js version against `pay-monthly-bill/index.ts` and use the same ones.

- [ ] **Step 2: Deploy**

Deploy via MCP `deploy_edge_function` (`project_id: rsfrvjaqxhoqavvscvwf`, name `initialize-plan-checkout`). Expected: deployed.

- [ ] **Step 3: Smoke test (unauthenticated rejection)**

```bash
curl -s -X POST "https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/initialize-plan-checkout" -H "Content-Type: application/json" -d '{"purpose":"subscription"}'
```

Expected: JSON error (missing auth), NOT a 5xx crash.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/initialize-plan-checkout/index.ts
git commit -m "feat(edge): initialize-plan-checkout for listing fee and subscription"
```

---

### Task 5: Extend `paystack-webhook` — listing fees + subscription lifecycle

**Files:**
- Modify: `supabase/functions/paystack-webhook/index.ts`

- [ ] **Step 1: Read the current file.** Locate: the HMAC verification, the `charge.success` handler with the `BILL_` branch, and the legacy payments-table fallback. All additions below go inside the existing event dispatch; do not touch the `BILL_` branch.

- [ ] **Step 2: Add helper functions** (top level, after existing helpers):

```ts
// Mark a landlord as an active subscriber and mirror into billing_subscriptions.
async function activateSubscription(
  supabase: any,
  userId: string,
  fields: { customerCode?: string; subscriptionCode?: string; periodEnd?: string | null },
) {
  const periodEnd = fields.periodEnd
    ?? new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(); // fallback: paid_at + 35d
  await supabase.from("billing_subscriptions").upsert({
    user_id: userId,
    plan_code: "subscriber",
    status: "active",
    provider: "paystack",
    current_period_end: periodEnd,
    ...(fields.customerCode ? { paystack_customer_code: fields.customerCode } : {}),
    ...(fields.subscriptionCode ? { paystack_subscription_code: fields.subscriptionCode } : {}),
  }, { onConflict: "user_id" });
  // The DB trigger on billing_subscriptions syncs profiles.plan; update directly too
  // in case the trigger is ever disabled.
  await supabase.from("profiles").update({
    plan: "subscriber",
    plan_status: "active",
    plan_expires_at: periodEnd,
    plan_last_synced: new Date().toISOString(),
  }).eq("user_id", userId);
}

async function resolveUserByCustomerCode(supabase: any, customerCode: string): Promise<string | null> {
  const { data } = await supabase
    .from("billing_subscriptions")
    .select("user_id")
    .eq("paystack_customer_code", customerCode)
    .maybeSingle();
  return data?.user_id ?? null;
}
```

Before finalizing, check `billing_subscriptions` columns in `20251004120000_billing_payfast.sql` — if the period column is named differently (e.g. `current_period_end` vs `next_payment_date`), use the actual column; `plan_code` must satisfy any CHECK constraint (if a CHECK restricts values, use an allowed one and note it).

- [ ] **Step 3: Add the `LISTING_` branch** in the `charge.success` handler, after the `BILL_` branch and before the legacy fallback:

```ts
} else if (reference.startsWith("LISTING_")) {
  const propertyId = event.data?.metadata?.property_id
    ?? reference.split("_")[1] ?? null;
  const landlordId = event.data?.metadata?.landlord_id ?? null;
  const amount = event.data?.amount;
  if (!propertyId || !landlordId) {
    logStep("LISTING_ missing metadata", { reference });
  } else if (amount !== 9900) {
    logStep("LISTING_ amount mismatch", { reference, amount });
  } else {
    // 1) Record the payment (idempotent), 2) publish — order matters: the
    // publish trigger checks listing_payments.
    await supabase.from("listing_payments").upsert({
      property_id: propertyId,
      landlord_id: landlordId,
      amount: amount / 100,
      paystack_reference: reference,
    }, { onConflict: "property_id", ignoreDuplicates: true });
    const { error: pubErr } = await supabase
      .from("properties")
      .update({ is_listed: true })
      .eq("id", propertyId);
    if (pubErr) logStep("LISTING_ publish failed", { propertyId, error: pubErr.message });
    await supabase.rpc("create_notification", {
      _user_id: landlordId,
      _message: "Payment received — your listing is now live on MzanziHomes.",
      _link_url: "/enhancedlandlorddashboard",
      _type: "billing",
      _metadata: { property_id: propertyId, reference },
    });
  }
}
```

(Use the same variable names the file already uses for the parsed event and the service-role client — read them from the `BILL_` branch.)

- [ ] **Step 4: Handle subscription charges** — in the same `charge.success` handler, a `SUB_` reference (first checkout) or any charge with `event.data.plan?.plan_code` (renewals initiated by Paystack use Paystack-generated references):

```ts
} else if (reference.startsWith("SUB_") || event.data?.plan?.plan_code) {
  const landlordId = event.data?.metadata?.landlord_id
    ?? (event.data?.customer?.customer_code
        ? await resolveUserByCustomerCode(supabase, event.data.customer.customer_code)
        : null);
  if (!landlordId) {
    logStep("SUB charge: could not resolve user", { reference });
  } else {
    await activateSubscription(supabase, landlordId, {
      customerCode: event.data?.customer?.customer_code,
      periodEnd: null, // paid_at + 35d fallback; subscription.create refines it
    });
    // Optional auto-publish when the subscription was bought from the publish paywall.
    const propertyId = event.data?.metadata?.property_id;
    if (propertyId) {
      const { error: pubErr } = await supabase
        .from("properties").update({ is_listed: true }).eq("id", propertyId);
      if (pubErr) logStep("SUB publish failed", { propertyId, error: pubErr.message });
    }
    await supabase.rpc("create_notification", {
      _user_id: landlordId,
      _message: "Your MzanziHomes subscription is active. All landlord tools are unlocked.",
      _link_url: "/enhancedlandlorddashboard",
      _type: "billing",
      _metadata: { reference },
    });
  }
}
```

- [ ] **Step 5: Add subscription lifecycle events** — in the top-level event dispatch (sibling of `charge.success`):

```ts
} else if (event.event === "subscription.create") {
  const customerCode = event.data?.customer?.customer_code;
  const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
  if (userId) {
    await supabase.from("billing_subscriptions").update({
      paystack_subscription_code: event.data?.subscription_code,
      current_period_end: event.data?.next_payment_date ?? undefined,
    }).eq("user_id", userId);
    if (event.data?.next_payment_date) {
      await supabase.from("profiles").update({
        plan_expires_at: event.data.next_payment_date,
        plan_last_synced: new Date().toISOString(),
      }).eq("user_id", userId);
    }
  } else {
    logStep("subscription.create: unknown customer", { customerCode });
  }
} else if (event.event === "subscription.not_renew") {
  const customerCode = event.data?.customer?.customer_code;
  const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
  if (userId) {
    await supabase.from("billing_subscriptions").update({ status: "non-renewing" }).eq("user_id", userId);
    await supabase.from("profiles").update({
      plan_status: "non-renewing",
      plan_last_synced: new Date().toISOString(),
    }).eq("user_id", userId);
  }
} else if (event.event === "subscription.disable") {
  const customerCode = event.data?.customer?.customer_code;
  const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
  if (userId) {
    await supabase.from("billing_subscriptions").update({ status: "cancelled" }).eq("user_id", userId);
    await supabase.from("profiles").update({
      plan: "free",
      plan_status: "cancelled",
      plan_last_synced: new Date().toISOString(),
    }).eq("user_id", userId);
    // Paid R99 listings stay live: we never touch is_listed here.
  }
}
```

- [ ] **Step 6: Deploy + smoke test**

Deploy via MCP `deploy_edge_function` (name `paystack-webhook`). Then verify the signature guard still rejects unsigned posts:

```bash
curl -s -X POST "https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/paystack-webhook" -H "Content-Type: application/json" -d '{"event":"charge.success"}'
```

Expected: 4xx (invalid signature), not 200.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/paystack-webhook/index.ts
git commit -m "feat(edge): webhook handles listing fees and subscription lifecycle"
```

---

### Task 6: `usePlanCheckout` + `PublishPaywallSheet`

**Files:**
- Create: `packages/features/src/billing/hooks/usePlanCheckout.ts`
- Create: `packages/features/src/billing/components/PublishPaywallSheet.tsx`
- Modify: `packages/features/src/billing/index.ts` (add exports)

- [ ] **Step 1: Write the checkout hook**

```ts
// packages/features/src/billing/hooks/usePlanCheckout.ts
import { useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';

export type CheckoutPurpose = 'subscription' | 'listing_fee';

export function usePlanCheckout() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (purpose: CheckoutPurpose, propertyId?: string) => {
    setStarting(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose, property_id: propertyId },
      });
      if (fnErr) throw fnErr;
      if (!data?.success || !data?.authorization_url) {
        throw new Error(data?.error || 'Could not start checkout');
      }
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return { startCheckout, starting, error };
}
```

(Match the supabase client import path used by the other files in `packages/features/src/billing/hooks/` — read `useMonthlyBills` first and copy its import.)

- [ ] **Step 2: Write the paywall sheet**

```tsx
// packages/features/src/billing/components/PublishPaywallSheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Loader2, Sparkles, Tag } from 'lucide-react';
import { usePlanCheckout } from '../hooks/usePlanCheckout';

interface PublishPaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
}

export function PublishPaywallSheet({ open, onOpenChange, propertyId }: PublishPaywallSheetProps) {
  const { startCheckout, starting, error } = usePlanCheckout();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Publish your listing</SheetTitle>
          <SheetDescription>
            Your property is saved as a draft. Choose how you want to go live.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4 pb-4">
          {/* Subscription — recommended */}
          <button
            className="w-full text-left rounded-2xl border-2 border-primary bg-primary/5 p-4 disabled:opacity-60"
            disabled={starting || !propertyId}
            onClick={() => propertyId && startCheckout('subscription', propertyId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Subscribe — R149/month</p>
                <p className="text-xs text-muted-foreground">
                  Unlimited listings + all management tools: messaging, applications,
                  leases, rent collection, SwiftBooks and more.
                </p>
              </div>
            </div>
          </button>

          {/* Once-off listing fee */}
          <button
            className="w-full text-left rounded-2xl border border-border p-4 disabled:opacity-60"
            disabled={starting || !propertyId}
            onClick={() => propertyId && startCheckout('listing_fee', propertyId)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Pay per listing — R99 once-off</p>
                <p className="text-xs text-muted-foreground">
                  This listing goes live and stays live. Interested tenants send you
                  their contact details — you contact them directly.
                </p>
              </div>
            </div>
          </button>

          {starting && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Opening secure checkout…
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <p className="text-[11px] text-muted-foreground text-center">
            Secure payment by Paystack. Your draft is saved either way.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3: Export from the billing barrel** — append to `packages/features/src/billing/index.ts`:

```ts
export { PublishPaywallSheet } from './components/PublishPaywallSheet';
export { usePlanCheckout } from './hooks/usePlanCheckout';
```

- [ ] **Step 4: Typecheck** — `cd apps/landlord && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/billing
git commit -m "feat(billing): publish paywall sheet and plan checkout hook"
```

---

### Task 7: Wire the publish paywall into ListProperty and ListSale

**Files:**
- Modify: `apps/landlord/src/pages/ListProperty.tsx`
- Modify: `apps/landlord/src/pages/ListSale.tsx`

Pattern (identical for both pages): insert the property **unlisted**, then *attempt* to publish; the DB trigger decides. Subscribers publish transparently; free landlords hit `PUBLISH_PAYWALL` and get the sheet.

- [ ] **Step 1: ListProperty — modify `onSubmit`**

In the existing `onSubmit`, change the `.insert(...)` call to (a) add `is_listed: false` to the inserted object and (b) chain `.select('id').single()` to get the new id. Then, after a successful insert and before the existing success dialog logic, add:

```tsx
// Attempt to publish — the DB paywall trigger allows it for subscribers
// and for properties with a paid listing fee.
const { error: publishErr } = await supabase
  .from('properties')
  .update({ is_listed: true })
  .eq('id', newProperty.id);

if (publishErr) {
  if (publishErr.message?.includes('PUBLISH_PAYWALL')) {
    setPaywallPropertyId(newProperty.id);
    setShowPaywall(true);
    return; // draft saved; success dialog is skipped
  }
  throw publishErr;
}
// existing success dialog ("now live on MzanziHomes") continues from here
```

Add state + imports at the top of the component:

```tsx
import { PublishPaywallSheet } from '@mzanzihomes/features/billing';
// ...
const [showPaywall, setShowPaywall] = useState(false);
const [paywallPropertyId, setPaywallPropertyId] = useState<string | null>(null);
```

And render the sheet next to the existing SuccessDialog:

```tsx
<PublishPaywallSheet open={showPaywall} onOpenChange={setShowPaywall} propertyId={paywallPropertyId} />
```

Also clear the localStorage draft before showing the paywall (same call the success path makes) so a paid return visit doesn't resurrect the wizard.

- [ ] **Step 2: ListSale — same treatment** in its `onSubmit` (lines ~178-236): add `is_listed: false` to the insert, `.select('id').single()`, the publish attempt, the same paywall state/render.

- [ ] **Step 3: Typecheck** — `cd apps/landlord && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 4: Manual verification (dev)** — with a free-plan landlord, submit a listing: expect the paywall sheet, and in the DB the property exists with `is_listed = false`.

- [ ] **Step 5: Commit**

```bash
git add apps/landlord/src/pages/ListProperty.tsx apps/landlord/src/pages/ListSale.tsx
git commit -m "feat(landlord): publish paywall on listing submission"
```

---

### Task 8: Post-sign-in plan prompt + gated dashboard tiles

**Files:**
- Create: `apps/landlord/src/components/PlanPromptSheet.tsx`
- Create: `apps/landlord/src/components/SubscribeGateDialog.tsx`
- Modify: `apps/landlord/src/pages/EnhancedLandlordDashboard.tsx`

- [ ] **Step 1: PlanPromptSheet** — shown once per session after sign-in for non-subscribers:

```tsx
// apps/landlord/src/components/PlanPromptSheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Sparkles, Tag, Check } from 'lucide-react';
import { usePlanCheckout } from '@mzanzihomes/features/billing';

const SUBSCRIBER_FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, leases & e-signing',
  'Rent collection & payments',
  'SwiftBooks accounting & analytics',
  'Maintenance & inspections',
];

interface PlanPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanPromptSheet({ open, onOpenChange }: PlanPromptSheetProps) {
  const { startCheckout, starting, error } = usePlanCheckout();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Choose how you want to use MzanziHomes</SheetTitle>
          <SheetDescription>
            Subscribe for the full toolkit, or pay per listing and manage things your own way.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4 pb-4">
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="font-semibold">Subscription — R149/month</p>
            </div>
            <ul className="space-y-1 mb-3">
              {SUBSCRIBER_FEATURES.map((f) => (
                <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full rounded-xl" disabled={starting} onClick={() => startCheckout('subscription')}>
              Subscribe now
            </Button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold">Pay per listing — R99 once-off</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Each listing goes live for a once-off R99. Tenants send you their contact
              details and you take it from there. You can subscribe any time.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
              Continue free — pay when I publish
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: SubscribeGateDialog** — shown when a free landlord taps a gated tile:

```tsx
// apps/landlord/src/components/SubscribeGateDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Lock, Sparkles } from 'lucide-react';
import { usePlanCheckout } from '@mzanzihomes/features/billing';

interface SubscribeGateDialogProps {
  featureName: string | null; // null = closed
  onClose: () => void;
}

export function SubscribeGateDialog({ featureName, onClose }: SubscribeGateDialogProps) {
  const { startCheckout, starting, error } = usePlanCheckout();

  return (
    <Dialog open={featureName !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{featureName} is a subscriber tool</DialogTitle>
          <DialogDescription className="text-center">
            Unlock {featureName?.toLowerCase()} and every other management tool —
            messaging, leases, rent collection, SwiftBooks — for R149/month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button className="w-full rounded-xl" disabled={starting} onClick={() => startCheckout('subscription')}>
            <Sparkles className="w-4 h-4 mr-2" /> Subscribe — R149/month
          </Button>
          <Button variant="ghost" className="w-full rounded-xl" onClick={onClose}>
            Not now
          </Button>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire both into the dashboard.** In `EnhancedLandlordDashboard.tsx`:

Imports + state (inside the component, near the other `useState` calls):

```tsx
import { PlanPromptSheet } from '@/components/PlanPromptSheet';
import { SubscribeGateDialog } from '@/components/SubscribeGateDialog';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';
// ...
const { isSubscriber, loading: planLoading } = useSubscription();
const [showPlanPrompt, setShowPlanPrompt] = useState(false);
const [gatedFeature, setGatedFeature] = useState<string | null>(null);

// Prompt the plans once per session after sign-in (free landlords only).
useEffect(() => {
  if (authLoading || planLoading || !user || !isLandlord) return;
  if (isSubscriber) return;
  if (sessionStorage.getItem('planPromptShown')) return;
  sessionStorage.setItem('planPromptShown', '1');
  setShowPlanPrompt(true);
}, [authLoading, planLoading, user, isLandlord, isSubscriber]);
```

Tile gating — replace the `onToolClick` handler (currently at ~line 2448):

```tsx
// Tiles anyone can use without a subscription.
const FREE_TOOLS = new Set(['List Property', 'My Profile', 'Support']);
```

(module scope, next to `LANDLORD_TOOL_COLORS`), and:

```tsx
<ToolGrid
  tools={tools}
  onToolClick={(tool) => {
    if (!user) { navigate('/auth'); return; }
    if (!FREE_TOOLS.has(tool.title) && !isSubscriber) {
      setGatedFeature(tool.title);
      return;
    }
    if (tool.action) tool.action();
    else if (tool.tab) handleTabChange(tool.tab);
    else if (tool.path) navigate(tool.path);
  }}
/>
```

Render both overlays near the other modals at the bottom of the component's JSX:

```tsx
<PlanPromptSheet open={showPlanPrompt} onOpenChange={setShowPlanPrompt} />
<SubscribeGateDialog featureName={gatedFeature} onClose={() => setGatedFeature(null)} />
```

**Also gate deep links**: tiles are one entry point, but `handleTabChange`/URL tabs are another. Do not block URL tabs in this task — Task 11 (PlanGuard) covers route-level protection; the tile gate is the UX layer.

- [ ] **Step 4: Typecheck** — `cd apps/landlord && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Manual verification (dev)** — sign in as a free landlord: the plan prompt appears once; tiles all render; tapping Payments opens the subscribe dialog; tapping List Property navigates normally.

- [ ] **Step 6: Commit**

```bash
git add apps/landlord/src/components/PlanPromptSheet.tsx apps/landlord/src/components/SubscribeGateDialog.tsx apps/landlord/src/pages/EnhancedLandlordDashboard.tsx
git commit -m "feat(landlord): post-sign-in plan prompt and subscriber-gated tool tiles"
```

---

### Task 9: `PlanSuccess` page + route

**Files:**
- Create: `apps/landlord/src/pages/PlanSuccess.tsx`
- Modify: `apps/landlord/src/App.tsx` (add route)

- [ ] **Step 1: Write the page**

```tsx
// apps/landlord/src/pages/PlanSuccess.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';

export default function PlanSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const { isSubscriber, refresh } = useSubscription();
  const [confirmed, setConfirmed] = useState(false);

  // The webhook confirms asynchronously; poll a few times so the page can flip
  // from "activating" to "done" without a manual reload.
  useEffect(() => {
    if (isSubscriber || propertyId) { setConfirmed(true); return; }
    let attempts = 0;
    const t = setInterval(() => {
      attempts += 1;
      refresh();
      if (attempts >= 10) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [isSubscriber, propertyId, refresh]);

  const done = confirmed || isSubscriber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-xl border border-border p-6 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          {done
            ? <CheckCircle2 className="w-8 h-8 text-success" />
            : <Loader2 className="w-8 h-8 text-success animate-spin" />}
        </div>
        <h1 className="text-xl font-bold mb-1">
          {done ? 'Payment received!' : 'Confirming your payment…'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {propertyId
            ? 'Your listing is being published — it will be live in a moment.'
            : done
              ? 'Your subscription is active. All landlord tools are unlocked.'
              : 'This usually takes a few seconds.'}
        </p>
        <Button className="w-full rounded-xl" onClick={() => navigate('/enhancedlandlorddashboard')}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the route** in `apps/landlord/src/App.tsx`, following the file's existing lazy-import + `<Route>` pattern:

```tsx
<Route path="/plan-success" element={<PlanSuccess />} />
```

(Un-guarded by PlanGuard — the user has just paid.)

- [ ] **Step 3: Typecheck** — `cd apps/landlord && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/landlord/src/pages/PlanSuccess.tsx apps/landlord/src/App.tsx
git commit -m "feat(landlord): plan checkout success page"
```

---

### Task 10: `submit-property-lead` edge function

**Files:**
- Create: `supabase/functions/submit-property-lead/index.ts`

Lead flow: tenant on a free landlord's paid listing submits interest → row in `inquiries` + in-app notification with the tenant's contact details + email to the landlord via Resend. No message thread is created.

- [ ] **Step 1: Write the function** (Resend pattern copied from `supabase/functions/send-payment-reminder/index.ts` — same import, env var names, from-address defaults):

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) =>
  console.log(`[SUBMIT-PROPERTY-LEAD] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user) throw new Error("Not authenticated");

    const { property_id, message, phone } = await req.json();
    if (!property_id) throw new Error("property_id is required");

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id, title, location, landlord_id")
      .eq("id", property_id)
      .single();
    if (propErr || !property) throw new Error("Property not found");

    // Lead flow only applies to free landlords — subscribers use messaging.
    const { data: mode } = await supabase.rpc("get_property_contact_mode", {
      _property_id: property_id,
    });
    if (mode !== "lead") throw new Error("This landlord uses in-app messaging");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    const tenantName = profile?.display_name || user.email || "A tenant";
    const tenantPhone = phone || profile?.phone || null;

    const { error: leadErr } = await supabase.from("inquiries").insert({
      property_id,
      tenant_id: user.id,
      name: tenantName,
      email: user.email,
      phone: tenantPhone,
      message: message || "I'm interested in this property.",
      status: "pending",
    });
    if (leadErr) throw new Error(`Could not save your enquiry: ${leadErr.message}`);

    const where = property.title || property.location || "your listing";
    const contactBits = [user.email, tenantPhone].filter(Boolean).join(" · ");
    await supabase.rpc("create_notification", {
      _user_id: property.landlord_id,
      _message: `New lead for ${where}: ${tenantName} (${contactBits}). Contact them directly.`,
      _link_url: "/enhancedlandlorddashboard",
      _type: "system",
      _metadata: { property_id, tenant_id: user.id, kind: "lead" },
    });

    // Email is best-effort — the in-app notification is the source of truth.
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co";
        const fromName = Deno.env.get("RESEND_FROM_NAME") || "MzanziHomes";
        const { data: landlordUser } = await supabase.auth.admin.getUserById(property.landlord_id);
        const to = landlordUser?.user?.email;
        if (to) {
          await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject: `New lead for ${where}`,
            html: `
              <h2>You have a new lead 🎉</h2>
              <p><strong>${tenantName}</strong> is interested in <strong>${where}</strong>.</p>
              <ul>
                <li>Email: ${user.email}</li>
                ${tenantPhone ? `<li>Phone: ${tenantPhone}</li>` : ""}
              </ul>
              ${message ? `<p>"${message}"</p>` : ""}
              <p>Reply to them directly — this lead came through your pay-per-listing plan.</p>
            `,
          });
        }
      }
    } catch (emailErr) {
      logStep("Email failed (non-fatal)", { error: (emailErr as Error).message });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStep("ERROR", { message: (e as Error).message });
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
```

Pre-check: confirm the `inquiries` table columns against `supabase/migrations/20250804103254_*.sql` (`property_id, tenant_id, name, email, phone, message, status`) — adjust the insert if any differ.

- [ ] **Step 2: Deploy** via MCP `deploy_edge_function` (name `submit-property-lead`). Smoke test:

```bash
curl -s -X POST "https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/submit-property-lead" -H "Content-Type: application/json" -d '{}'
```

Expected: JSON auth error, not 5xx.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/submit-property-lead/index.ts
git commit -m "feat(edge): submit-property-lead for pay-per-listing landlords"
```

---

### Task 11: Tenant lead flow — `LeadContactDialog` + `StartConversation` gating

**Files:**
- Create: `packages/features/src/messaging/components/LeadContactDialog.tsx`
- Modify: `packages/features/src/messaging/components/StartConversation.tsx`

- [ ] **Step 1: LeadContactDialog**

```tsx
// packages/features/src/messaging/components/LeadContactDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

interface LeadContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  propertyTitle?: string;
}

export function LeadContactDialog({ open, onOpenChange, propertyId, propertyTitle }: LeadContactDialogProps) {
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('submit-property-lead', {
        body: { property_id: propertyId, message: message.trim() || undefined, phone: phone.trim() || undefined },
      });
      if (fnErr) throw fnErr;
      if (!data?.success) throw new Error(data?.error || 'Could not send your enquiry');
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Could not send your enquiry');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <h2 className="font-bold text-lg mb-1">Enquiry sent!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              The landlord has your details and will contact you directly.
            </p>
            <Button className="w-full rounded-xl" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>I'm interested</DialogTitle>
              <DialogDescription>
                {propertyTitle ? `Send your details to the landlord of ${propertyTitle}.` : 'Send your details to the landlord.'}{' '}
                They'll contact you directly.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <Textarea
                placeholder="Add a short message (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <Button className="w-full rounded-xl" disabled={sending} onClick={submit}>
                {sending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                  : <><Send className="w-4 h-4 mr-2" /> Send my details</>}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Gate `StartConversation`.** In `handleRequestViewingClick` (the entry point for every contact button — PropertyDetail passes through `GatedViewingButton`'s `renderStartConversation`), before the existing-conversation check, add:

```tsx
const { data: contactMode } = await supabase.rpc('get_property_contact_mode', {
  _property_id: propertyId,
});
if (contactMode === 'lead') {
  setShowLeadDialog(true);
  return;
}
// existing flow (pre-screening / direct dialog) continues unchanged
```

Add state + render:

```tsx
const [showLeadDialog, setShowLeadDialog] = useState(false);
// ... in the JSX, alongside the existing dialogs:
<LeadContactDialog
  open={showLeadDialog}
  onOpenChange={setShowLeadDialog}
  propertyId={propertyId}
  propertyTitle={propertyTitle}
/>
```

(`propertyId` and `propertyTitle` are existing props of StartConversation — check their exact names in the file and match them.)

- [ ] **Step 3: Typecheck** — `cd apps/tenant && npx tsc --noEmit` and `cd apps/web && npx tsc --noEmit` (StartConversation is shared). Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/messaging/components/LeadContactDialog.tsx packages/features/src/messaging/components/StartConversation.tsx
git commit -m "feat(messaging): lead contact flow for pay-per-listing landlords"
```

---

### Task 12: Re-enable `PlanGuard`, rewrite `UpgradePrompt`

**Files:**
- Rewrite: `packages/ui/src/components/PlanGuard.tsx`
- Rewrite: `packages/ui/src/components/subscription/UpgradePrompt.tsx`
- Modify: `apps/landlord/src/App.tsx` (un-gate the dashboard route)

- [ ] **Step 1: PlanGuard** — remove the `return <>{children}</>` bypass and gate on the subscriber tier. Legacy `requiredPlan="pro"|"premium"` both mean "subscriber"; `"free"` passes everyone:

```tsx
// packages/ui/src/components/PlanGuard.tsx — replace the component body
import { useSubscription, type PlanType } from '@mzanzihomes/supabase/hooks/useSubscription';
import { UpgradePrompt } from './subscription/UpgradePrompt';

interface PlanGuardProps {
  children: React.ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
}

export function PlanGuard({ children, requiredPlan, featureName }: PlanGuardProps) {
  const { isSubscriber, loading } = useSubscription();

  if (requiredPlan === 'free') return <>{children}</>;
  if (loading) return null; // avoid flashing the prompt while plan state loads
  if (isSubscriber) return <>{children}</>;
  return <UpgradePrompt featureName={featureName} />;
}
```

(Keep the file's existing import paths — check how it currently imports `useSubscription` and reuse that path.)

- [ ] **Step 2: Un-gate the dashboard route.** In `apps/landlord/src/App.tsx` line ~170, the `<PlanGuard requiredPlan="pro" featureName="Landlord Dashboard">` wrapper around the dashboard route must be removed (render its children directly): free landlords need the dashboard to add properties, see leads, and hit the tile gates. All other `PlanGuard` usages stay as they are (their `"pro"`/`"premium"` values now mean subscriber).

- [ ] **Step 3: UpgradePrompt rewrite** — two-tier, launches checkout directly (no `/pricing` navigation, which doesn't exist in the landlord app):

```tsx
// packages/ui/src/components/subscription/UpgradePrompt.tsx — full replacement
import { useState } from 'react';
import { Button } from '../button';
import { Lock, Sparkles, Loader2, Check } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

const FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, leases & e-signing',
  'Rent collection & payments',
  'SwiftBooks accounting & analytics',
  'Maintenance & inspections',
];

interface UpgradePromptProps {
  featureName?: string;
}

export function UpgradePrompt({ featureName }: UpgradePromptProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setStarting(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose: 'subscription' },
      });
      if (fnErr) throw fnErr;
      if (!data?.success || !data?.authorization_url) throw new Error(data?.error || 'Could not start checkout');
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-1">
          {featureName ? `${featureName} is a subscriber tool` : 'Subscribers only'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Get the full landlord toolkit for R149/month.
        </p>
        <ul className="text-left space-y-1.5 mb-5">
          {FEATURES.map((f) => (
            <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <Button className="w-full rounded-xl h-11" disabled={starting} onClick={subscribe}>
          {starting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Subscribe — R149/month</>}
        </Button>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}
```

(Check the file's current relative import paths for `Button` and the supabase client and keep them.)

- [ ] **Step 4: Typecheck** — `cd apps/landlord && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/PlanGuard.tsx packages/ui/src/components/subscription/UpgradePrompt.tsx apps/landlord/src/App.tsx
git commit -m "feat(ui): re-enable PlanGuard against subscriber tier, two-tier UpgradePrompt"
```

---

### Task 13: Rewrite web Pricing, retire Callpay

**Files:**
- Rewrite: `apps/web/src/pages/Pricing.tsx`
- Delete: `apps/web/src/services/callpayService.ts`
- Delete: `supabase/functions/callpay-initiate/`, `supabase/functions/callpay-webhook/`, `supabase/functions/callpay-test/`, `supabase/functions/activate-subscription/`

- [ ] **Step 1: Rewrite `Pricing.tsx`** as a two-tier page. The web app is the public marketing site; the subscribe CTA calls `initialize-plan-checkout` for signed-in landlords and routes to auth otherwise. Keep the page's existing layout wrapper/nav imports; replace the plan cards and all Callpay logic:

```tsx
// Core of the new Pricing.tsx (keep the file's existing page shell/nav imports)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Check, Sparkles, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

const SUBSCRIBER_FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, screening & leases with e-signing',
  'Rent collection with Paystack + receipts',
  'SwiftBooks accounting & analytics',
  'Maintenance requests & inspections',
];

const LISTING_FEATURES = [
  'Your listing live until rented',
  'Interested tenants send you their contact details',
  'You arrange viewings and paperwork directly',
  'Upgrade to the subscription any time',
];

export default function Pricing() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setStarting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth?redirect=/pricing'); return; }
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose: 'subscription' },
      });
      if (fnErr) throw fnErr;
      if (!data?.success || !data?.authorization_url) throw new Error(data?.error || 'Could not start checkout');
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Simple pricing for landlords</h1>
        <p className="text-muted-foreground">
          Subscribe for the full toolkit, or pay once per listing. Tenants always use MzanziHomes free.
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
        {/* Subscription */}
        <div className="rounded-3xl border-2 border-primary bg-card p-6 shadow-sm relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-3 py-1">
            Recommended
          </span>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Subscription</h2>
          </div>
          <p className="text-3xl font-extrabold mb-4">R149<span className="text-sm font-medium text-muted-foreground">/month</span></p>
          <ul className="space-y-2 mb-6">
            {SUBSCRIBER_FEATURES.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          <Button className="w-full rounded-xl h-11" disabled={starting} onClick={subscribe}>
            {starting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</> : 'Subscribe now'}
          </Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>

        {/* Pay per listing */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-bold text-lg">Pay per listing</h2>
          </div>
          <p className="text-3xl font-extrabold mb-4">R99<span className="text-sm font-medium text-muted-foreground"> once-off</span></p>
          <ul className="space-y-2 mb-6">
            {LISTING_FEATURES.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2">
                <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => navigate('/auth?redirect=/list-property')}>
            List a property
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            You pay when you publish the listing.
          </p>
        </div>
      </div>
    </div>
  );
}
```

Adjust the auth-redirect paths (`/auth?redirect=...`) to whatever the web app's actual auth route is — check `apps/web/src/App.tsx` routes first.

- [ ] **Step 2: Delete Callpay client code**

```bash
git rm apps/web/src/services/callpayService.ts
```

- [ ] **Step 3: Delete Callpay edge functions**

```bash
git rm -r supabase/functions/callpay-initiate supabase/functions/callpay-webhook supabase/functions/callpay-test supabase/functions/activate-subscription
```

Also remove any `[functions.callpay-*]` / `[functions.activate-subscription]` blocks from `supabase/config.toml` if present.

- [ ] **Step 4: Sweep for stragglers**

```bash
grep -ri "callpay" --include="*.ts" --include="*.tsx" --include="*.toml" .
```

Expected: no matches outside `docs/` and this plan. Fix any remaining imports (the survey found only `Pricing.tsx` imports `callpayService`; `/payment-failed` redirects in Pricing are removed by the rewrite).

- [ ] **Step 5: Typecheck + build web**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): two-tier pricing page; retire Callpay billing"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full typecheck**

```bash
cd apps/landlord && npx tsc --noEmit
cd ../tenant && npx tsc --noEmit
cd ../web && npx tsc --noEmit
```

Expected: PASS ×3.

- [ ] **Step 2: Tests**

```bash
npm run test
```

(from repo root) Expected: all pass, including `planAccess.test.ts` and the existing `billingCycle.test.ts`.

- [ ] **Step 3: Builds**

```bash
npx turbo build --filter=@mzanzihomes/landlord --filter=@mzanzihomes/tenant --filter=@mzanzihomes/web
```

Expected: 3 successful builds.

- [ ] **Step 4: End-to-end sanity (test-mode Paystack or live R1-style spot check, user's call)**

1. Free landlord signs in → plan prompt appears once.
2. Tiles all visible; tapping SwiftBooks opens the subscribe dialog; List Property/My Profile/Support work.
3. Submit a new listing → paywall sheet; property saved with `is_listed = false`.
4. Pay the R99 listing fee → webhook publishes (`is_listed = true`, `listing_payments` row), notification arrives.
5. Tenant opens that listing → "I'm interested" lead dialog (not messaging); landlord gets notification + email.
6. Landlord subscribes → `profiles.plan = 'subscriber'`; tiles unlock without reload (realtime); tenant contact on their listings switches to messaging.
7. Cancel the subscription in Paystack dashboard → `subscription.disable` webhook → plan back to `free`; the R99-paid listing stays live.

- [ ] **Step 5: Secret sweep before finishing**

```bash
git log --oneline main..HEAD
git diff main..HEAD | grep -E "sk_live|sk_test|re_[A-Za-z0-9]|eyJ" || echo CLEAN
```

Expected: `CLEAN` (the literal `'sk_test'` prefix-check string in initialize-plan-checkout and the public anon key in `packages/supabase/src/client.ts` are known-fine if they appear).

- [ ] **Step 6: Finish** — use superpowers:finishing-a-development-branch (merge/PR choice belongs to the user).

---

## Post-merge operational checklist (user actions, not code)

1. Paystack LIVE dashboard → confirm the webhook URL `https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/paystack-webhook` is registered (also required for the rent-collection flow).
2. First subscription checkout auto-creates the "MzanziHomes Landlord Subscription" R149/month plan in Paystack — verify it appears under Plans after the first test.
3. `RESEND_API_KEY` / `RESEND_FROM_EMAIL` already configured in Supabase secrets (used by rent reminders); lead emails reuse them.

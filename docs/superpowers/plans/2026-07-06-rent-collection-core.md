# Rent Collection Core Implementation Plan (Plan 1 of 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Monthly rent billing end-to-end: cron creates a draft bill 2 days before month-end → landlord adds utility expenses and sends → tenant sees a persistent red banner and pays via Paystack → receipt PDF + emails + notifications + SwiftBooks auto-entries. Verifiable in Paystack test mode.

**Architecture:** Two new tables (`monthly_bills`, `bill_line_items`) with RLS + realtime. Four edge functions (`billing-cycle`, `send-monthly-bill`, `pay-monthly-bill`, `generate-rent-receipt`) plus an extension to the existing `paystack-webhook`. pg_cron invokes `billing-cycle` daily. Client: landlord bill form in the Payments page stub, Rent Collection tile, tenant `RentDueBanner` mounted in the app root, bill detail + POP history.

**Tech Stack:** Supabase (Postgres, RLS, realtime, pg_cron + pg_net, Deno edge functions), Paystack (subaccounts, hosted checkout, webhooks), pdf-lib, Resend, React 18 + React Router + TanStack Query, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-06-rent-billing-paystack-swiftbooks-design.md` (sections 1–7).

**Conventions used throughout (from the existing codebase):**
- Edge functions: `serve` from deno std 0.190.0, `createClient` from `esm.sh/@supabase/supabase-js@2`, `corsHeaders` block, service-role client, `logStep` logging (see `supabase/functions/initialize-paystack-transaction/index.ts`).
- Notifications: `supabase.rpc('create_notification', { _user_id, _message, _link_url, _type, _metadata })`.
- Email: `Resend` from `esm.sh/resend@2.1.0`, from `` `MzanziHomes <${RESEND_FROM_EMAIL}>` `` (see `send-contract-to-tenant`).
- PDF: `pdf-lib@1.17.1`, upload to storage bucket, `getPublicUrl` (see `generate-lease-pdf`).
- Amounts are rands (NUMERIC) in the DB; Paystack wants kobo (`Math.round(rands * 100)`).
- Rent source of truth: `tenancies.monthly_rent`; landlord subaccount: `profiles.paystack_subaccount_code`.

---

### Task 1: Migration — bill tables, RLS, realtime

**Files:**
- Create: `supabase/migrations/20260706100000_monthly_billing.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Monthly billing: bills + line items
CREATE TABLE public.monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  period TEXT NOT NULL, -- 'YYYY-MM'
  rent_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'awaiting_landlord'
    CHECK (status IN ('awaiting_landlord','sent','paid')),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paystack_reference TEXT,
  receipt_pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenancy_id, period)
);

CREATE TABLE public.bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.monthly_bills(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('water','sewage','electricity','refuse','other')),
  label TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;

-- Landlord: full read of own bills
CREATE POLICY "Landlords read own bills" ON public.monthly_bills
  FOR SELECT USING (landlord_id = auth.uid());

-- Tenant: only sent/paid bills (drafts invisible)
CREATE POLICY "Tenants read sent bills" ON public.monthly_bills
  FOR SELECT USING (tenant_id = auth.uid() AND status IN ('sent','paid'));

-- Line items follow the parent bill's visibility
CREATE POLICY "Read line items via bill" ON public.bill_line_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.monthly_bills b
    WHERE b.id = bill_id
      AND (b.landlord_id = auth.uid()
           OR (b.tenant_id = auth.uid() AND b.status IN ('sent','paid')))
  ));

-- All writes go through edge functions (service role bypasses RLS);
-- no INSERT/UPDATE policies for authenticated users on purpose.

CREATE TRIGGER update_monthly_bills_updated_at
  BEFORE UPDATE ON public.monthly_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for the tenant banner (status changes must push instantly)
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_bills;

CREATE INDEX idx_monthly_bills_tenant_status ON public.monthly_bills (tenant_id, status);
CREATE INDEX idx_monthly_bills_landlord_status ON public.monthly_bills (landlord_id, status);
CREATE INDEX idx_monthly_bills_reference ON public.monthly_bills (paystack_reference);
```

- [ ] **Step 2: Apply and verify**

Run: `npx supabase db push` (from repo root; if the project uses the Supabase MCP, apply via `apply_migration` instead).
Expected: migration applies cleanly.
Then verify: query `select * from public.monthly_bills limit 1;` returns zero rows, no error.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260706100000_monthly_billing.sql
git commit -m "feat(billing): monthly_bills + bill_line_items tables with RLS and realtime"
```

---

### Task 2: Billing-period logic (pure, TDD)

The date math ("is today within the billing window for this month?") is the only tricky logic — keep it pure and tested, shared by the edge function.

**Files:**
- Create: `packages/common/src/utils/billingCycle.ts`
- Test: `packages/common/src/utils/billingCycle.test.ts`
- Modify: `packages/common/src/utils/index.ts` (add export, if a barrel exists — check first; if not, skip)

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { currentBillingPeriod, isInBillingWindow } from './billingCycle';

describe('currentBillingPeriod', () => {
  it('formats the period as YYYY-MM', () => {
    expect(currentBillingPeriod(new Date('2026-07-15'))).toBe('2026-07');
  });
});

describe('isInBillingWindow', () => {
  // Window opens 2 days before the last day of the month, stays open to month end.
  it('is false mid-month', () => {
    expect(isInBillingWindow(new Date('2026-07-15'))).toBe(false);
  });
  it('opens exactly 2 days before month-end (31-day month)', () => {
    expect(isInBillingWindow(new Date('2026-07-28'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-07-29'))).toBe(true);
    expect(isInBillingWindow(new Date('2026-07-31'))).toBe(true);
  });
  it('handles 30-day months', () => {
    expect(isInBillingWindow(new Date('2026-06-27'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-06-28'))).toBe(true);
  });
  it('handles February (non-leap)', () => {
    expect(isInBillingWindow(new Date('2026-02-25'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-02-26'))).toBe(true);
  });
  it('handles February (leap year)', () => {
    expect(isInBillingWindow(new Date('2028-02-26'))).toBe(false);
    expect(isInBillingWindow(new Date('2028-02-27'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- billingCycle` (from repo root — adjust to `npx vitest run billingCycle` if the workspace script differs)
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// Billing window: from (last day of month − 2) through month end.
// Self-healing: any daily run inside the window creates missing bills.

export function currentBillingPeriod(today: Date): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function isInBillingWindow(today: Date): boolean {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 2;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- billingCycle`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/common/src/utils/billingCycle.ts packages/common/src/utils/billingCycle.test.ts
git commit -m "feat(billing): billing window date logic with tests"
```

---

### Task 3: `billing-cycle` edge function (draft creation + landlord notification)

Deno functions can't import from `packages/common`, so the function inlines the same two helpers (they're 8 lines; keep them byte-identical to Task 2).

**Files:**
- Create: `supabase/functions/billing-cycle/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[BILLING-CYCLE] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

function currentBillingPeriod(today: Date): string {
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function isInBillingWindow(today: Date): boolean {
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() >= lastDay - 2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // SAST = UTC+2, no DST. Cron runs in UTC; convert so the window is evaluated in local time.
    const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
    if (!isInBillingWindow(now)) {
      logStep('Outside billing window', { date: now.toISOString() });
      return new Response(JSON.stringify({ created: 0, reason: 'outside window' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const period = currentBillingPeriod(now);

    const { data: tenancies, error: tenanciesError } = await supabase
      .from('tenancies')
      .select('id, property_id, landlord_id, tenant_id, monthly_rent, properties(title, location)')
      .eq('status', 'active');
    if (tenanciesError) throw tenanciesError;

    let created = 0;
    for (const t of tenancies ?? []) {
      // Idempotent: unique (tenancy_id, period) makes duplicates a no-op.
      const { error: insertError } = await supabase.from('monthly_bills').insert({
        tenancy_id: t.id,
        property_id: t.property_id,
        landlord_id: t.landlord_id,
        tenant_id: t.tenant_id,
        period,
        rent_amount: t.monthly_rent,
        status: 'awaiting_landlord',
      });

      if (insertError) {
        if (insertError.code === '23505') continue; // already billed this period
        logStep('Insert failed', { tenancy: t.id, error: insertError.message });
        continue;
      }

      created++;
      const propertyName = t.properties?.title || t.properties?.location || 'your property';
      await supabase.rpc('create_notification', {
        _user_id: t.landlord_id,
        _message: `Billing information needed for ${propertyName} — add this month's expenses and send the bill.`,
        _link_url: '/enhancedlandlorddashboard/payments',
        _type: 'billing',
        _metadata: { tenancy_id: t.id, period },
      });
    }

    logStep('Done', { period, created });
    return new Response(JSON.stringify({ created, period }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy and smoke-test**

Run: `npx supabase functions deploy billing-cycle`
Then invoke it manually (service role or anon key per project config):
`curl -X POST "$SUPABASE_URL/functions/v1/billing-cycle" -H "Authorization: Bearer $SUPABASE_ANON_KEY"`
Expected: `{"created":0,"reason":"outside window"}` mid-month, or `{"created":N,"period":"YYYY-MM"}` inside the window. Re-invoking inside the window returns `created: 0` (idempotent).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/billing-cycle/index.ts
git commit -m "feat(billing): billing-cycle edge function creates draft bills + landlord notifications"
```

---

### Task 4: Schedule `billing-cycle` daily with pg_cron

No cron exists in this project yet — this migration establishes the pattern.

**Files:**
- Create: `supabase/migrations/20260706110000_schedule_billing_cycle.sql`

- [ ] **Step 1: Write the migration**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 05:00 UTC = 07:00 SAST daily
SELECT cron.schedule(
  'billing-cycle-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/billing-cycle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Store the vault secrets (one-time, manual)**

In the Supabase SQL editor (values from the project dashboard — do NOT commit them):

```sql
SELECT vault.create_secret('<https://YOUR-PROJECT.supabase.co>', 'project_url');
SELECT vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
```

- [ ] **Step 3: Apply and verify**

Run: `npx supabase db push`
Verify: `SELECT jobname, schedule FROM cron.job;` shows `billing-cycle-daily` at `0 5 * * *`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260706110000_schedule_billing_cycle.sql
git commit -m "feat(billing): schedule billing-cycle daily via pg_cron"
```

---

### Task 5: `send-monthly-bill` edge function (landlord submits expenses)

**Files:**
- Create: `supabase/functions/send-monthly-bill/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-MONTHLY-BILL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

interface LineItemInput {
  category: 'water' | 'sewage' | 'electricity' | 'refuse' | 'other';
  label: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !userData.user) throw new Error('Not authenticated');
    const user = userData.user;

    const { billId, lineItems } = await req.json() as { billId: string; lineItems: LineItemInput[] };
    if (!billId) throw new Error('Missing billId');

    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, properties(title, location)')
      .eq('id', billId)
      .eq('landlord_id', user.id)
      .single();
    if (billError || !bill) throw new Error('Bill not found or access denied');
    if (bill.status !== 'awaiting_landlord') throw new Error('Bill has already been sent');

    // Server-side guard: no subaccount, no send (spec §3)
    const { data: profile } = await supabase
      .from('profiles')
      .select('paystack_subaccount_code')
      .eq('user_id', user.id)
      .single();
    if (!profile?.paystack_subaccount_code) {
      throw new Error('Rent collection setup incomplete. Add your bank details in the Rent Collection tile first.');
    }

    const items = (lineItems ?? []).filter(li => li.amount > 0);
    for (const li of items) {
      if (!['water','sewage','electricity','refuse','other'].includes(li.category)) {
        throw new Error(`Invalid category: ${li.category}`);
      }
      if (li.category === 'other' && !li.label?.trim()) {
        throw new Error('Custom charges need a label');
      }
    }

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('bill_line_items').insert(
        items.map(li => ({
          bill_id: billId,
          category: li.category,
          label: li.label?.trim() || li.category.charAt(0).toUpperCase() + li.category.slice(1),
          amount: li.amount,
        }))
      );
      if (itemsError) throw itemsError;
    }

    const total = Number(bill.rent_amount) + items.reduce((s, li) => s + li.amount, 0);

    const { error: updateError } = await supabase
      .from('monthly_bills')
      .update({ status: 'sent', total_amount: total, sent_at: new Date().toISOString() })
      .eq('id', billId)
      .eq('status', 'awaiting_landlord'); // guard against double-send race
    if (updateError) throw updateError;

    const propertyName = bill.properties?.title || bill.properties?.location || 'your home';
    await supabase.rpc('create_notification', {
      _user_id: bill.tenant_id,
      _message: `Your ${bill.period} bill for ${propertyName} is ready — R${total.toFixed(2)} due.`,
      _link_url: '/enhancedtenantdashboard/payments',
      _type: 'billing',
      _metadata: { bill_id: billId, period: bill.period, total },
    });

    logStep('Bill sent', { billId, total });
    return new Response(JSON.stringify({ success: true, total }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

> Note: check whether `profiles` keys on `user_id` or `id` before deploying — mirror whatever `create-paystack-subaccount/index.ts` uses.

- [ ] **Step 2: Deploy**

Run: `npx supabase functions deploy send-monthly-bill`
Expected: deploys cleanly.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-monthly-bill/index.ts
git commit -m "feat(billing): send-monthly-bill edge function (expenses + send to tenant)"
```

---

### Task 6: `pay-monthly-bill` edge function (tenant initiates Paystack checkout)

**Files:**
- Create: `supabase/functions/pay-monthly-bill/index.ts`

- [ ] **Step 1: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[PAY-MONTHLY-BILL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) throw new Error('PAYSTACK_SECRET_KEY is not set');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !userData.user?.email) throw new Error('Not authenticated');
    const user = userData.user;

    const { billId } = await req.json();
    if (!billId) throw new Error('Missing billId');

    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, landlord_profile:profiles!monthly_bills_landlord_id_fkey(paystack_subaccount_code)')
      .eq('id', billId)
      .eq('tenant_id', user.id)
      .single();
    // If the FK join name differs, fetch the profile in a second query keyed on bill.landlord_id.
    if (billError || !bill) throw new Error('Bill not found or access denied');
    if (bill.status !== 'sent') throw new Error(`Bill is not payable (status: ${bill.status})`);

    const subaccount = bill.landlord_profile?.paystack_subaccount_code;
    if (!subaccount) throw new Error('Landlord payment setup incomplete');

    const reference = `BILL_${billId}_${Date.now()}`;
    const amountInKobo = Math.round(Number(bill.total_amount) * 100);

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: 'ZAR',
        reference,
        callback_url: `${req.headers.get('origin') || 'http://localhost:3000'}/payment-success`,
        subaccount,
        transaction_charge: 0,
        bearer: 'account',
        metadata: { bill_id: billId, period: bill.period, tenancy_id: bill.tenancy_id },
      }),
    });
    const paystackData = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackData.status) {
      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    // Save the reference so the webhook can find this bill
    await supabase.from('monthly_bills').update({ paystack_reference: reference }).eq('id', billId);

    logStep('Initialized', { billId, reference, amountInKobo });
    return new Response(JSON.stringify({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference,
      amount: Number(bill.total_amount),
      test_mode: paystackSecretKey.startsWith('sk_test'),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

- [ ] **Step 2: Deploy**

Run: `npx supabase functions deploy pay-monthly-bill`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/pay-monthly-bill/index.ts
git commit -m "feat(billing): pay-monthly-bill edge function initializes Paystack checkout"
```

---

### Task 7: `generate-rent-receipt` edge function (PDF + email + notification + SwiftBooks)

Called by the webhook after a bill is marked paid. Kept separate so receipt failures never block payment confirmation and can be retried.

**Files:**
- Create: `supabase/functions/generate-rent-receipt/index.ts`

- [ ] **Step 1: Create the storage bucket (one-time, manual)**

In the Supabase dashboard (or SQL): create bucket `rent-receipts`, public read (mirrors `lease-documents`).

- [ ] **Step 2: Write the function**

```ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GENERATE-RENT-RECEIPT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const fmtR = (n: number) => `R${Number(n).toFixed(2)}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { billId } = await req.json();
    if (!billId) throw new Error('Missing billId');

    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, properties(title, location), bill_line_items(*)')
      .eq('id', billId)
      .single();
    if (billError || !bill) throw new Error('Bill not found');
    if (bill.status !== 'paid') throw new Error('Bill is not paid');
    if (bill.receipt_pdf_path) {
      logStep('Receipt already exists — skipping (idempotent)');
      return new Response(JSON.stringify({ success: true, already: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Party names + emails
    const { data: landlordProfile } = await supabase
      .from('profiles').select('display_name, email').eq('user_id', bill.landlord_id).single();
    const { data: tenantProfile } = await supabase
      .from('profiles').select('display_name, email').eq('user_id', bill.tenant_id).single();
    // If profiles lacks an email column, fall back to auth.admin.getUserById(...).user.email

    // ---- Build PDF ----
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const propertyName = bill.properties?.title || bill.properties?.location || 'Property';
    let y = 780;
    const draw = (text: string, opts: { x?: number; size?: number; isBold?: boolean } = {}) => {
      page.drawText(text, {
        x: opts.x ?? 60, y, size: opts.size ?? 11,
        font: opts.isBold ? bold : font, color: rgb(0.1, 0.1, 0.15),
      });
    };

    draw('MzanziHomes — Rent Receipt', { size: 18, isBold: true }); y -= 20;
    draw(`Receipt #: ${bill.id.slice(0, 8).toUpperCase()}-${bill.period}`, { size: 10 }); y -= 14;
    draw(`Paid: ${new Date(bill.paid_at).toLocaleDateString('en-ZA')}`, { size: 10 }); y -= 14;
    draw(`Paystack ref: ${bill.paystack_reference}`, { size: 10 }); y -= 28;
    draw(`Property: ${propertyName}`, { isBold: true }); y -= 16;
    draw(`Period: ${bill.period}`); y -= 16;
    draw(`Tenant: ${tenantProfile?.display_name ?? ''}`); y -= 16;
    draw(`Landlord: ${landlordProfile?.display_name ?? ''}`); y -= 30;

    draw('Item', { isBold: true }); draw('Amount', { x: 440, isBold: true }); y -= 18;
    draw('Rent'); draw(fmtR(bill.rent_amount), { x: 440 }); y -= 16;
    for (const li of bill.bill_line_items ?? []) {
      draw(li.label); draw(fmtR(li.amount), { x: 440 }); y -= 16;
    }
    y -= 8;
    draw('Total paid', { isBold: true }); draw(fmtR(bill.total_amount), { x: 440, isBold: true });

    const pdfBytes = await pdf.save();

    // ---- Upload ----
    const fileName = `${bill.landlord_id}/${bill.id}_receipt.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('rent-receipts')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('rent-receipts').getPublicUrl(fileName);

    await supabase.from('monthly_bills').update({ receipt_pdf_path: fileName }).eq('id', billId);

    // ---- Email both parties (best effort — never throw past this point) ----
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resend = new Resend(resendKey);
      const from = `MzanziHomes <${Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@MzanziHomes.co'}>`;
      const subject = `Rent receipt — ${propertyName}, ${bill.period}`;
      const html = `<p>Payment of <strong>${fmtR(bill.total_amount)}</strong> for ${propertyName} (${bill.period}) has been received.</p><p><a href="${urlData.publicUrl}">Download receipt (PDF)</a></p>`;
      for (const to of [tenantProfile?.email, landlordProfile?.email]) {
        if (!to) continue;
        const { error: emailError } = await resend.emails.send({ from, to: [to], subject, html });
        if (emailError) logStep('Email failed (non-fatal)', { to, error: emailError });
      }
    }

    // ---- Landlord notification ----
    await supabase.rpc('create_notification', {
      _user_id: bill.landlord_id,
      _message: `Rent paid — ${fmtR(bill.total_amount)} received for ${propertyName} (${bill.period}). View receipt.`,
      _link_url: '/enhancedlandlorddashboard/payments',
      _type: 'payment',
      _metadata: { bill_id: bill.id, receipt_path: fileName },
    });

    // ---- SwiftBooks auto-entries (income: rent + each recovered utility) ----
    const paidDate = new Date(bill.paid_at).toISOString().split('T')[0];
    const entries = [
      {
        user_id: bill.landlord_id, property_id: bill.property_id, type: 'income',
        date: paidDate, amount: bill.rent_amount, vat_percent: 0,
        category: 'Rent', vendor: 'Tenant',
        description: `Rent ${bill.period} (auto — bill ${bill.id.slice(0, 8)})`,
      },
      ...(bill.bill_line_items ?? []).map((li: { label: string; amount: number }) => ({
        user_id: bill.landlord_id, property_id: bill.property_id, type: 'income',
        date: paidDate, amount: li.amount, vat_percent: 0,
        category: 'Utility recovery', vendor: 'Tenant',
        description: `${li.label} ${bill.period} (auto — bill ${bill.id.slice(0, 8)})`,
      })),
    ];
    const { error: txnError } = await supabase.from('transactions').insert(entries);
    if (txnError) logStep('SwiftBooks insert failed (non-fatal)', { error: txnError.message });

    logStep('Receipt complete', { billId, fileName });
    return new Response(JSON.stringify({ success: true, receipt_url: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

> The `(auto — bill ...)` marker in `description` is how the SwiftBooks UI (Plan 4) recognizes auto entries; the `transactions` table has no tag column and we avoid schema churn here.

- [ ] **Step 3: Deploy**

Run: `npx supabase functions deploy generate-rent-receipt`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-rent-receipt/index.ts
git commit -m "feat(billing): rent receipt PDF + emails + notification + SwiftBooks auto-entries"
```

---

### Task 8: Extend `paystack-webhook` for bill payments

**Files:**
- Modify: `supabase/functions/paystack-webhook/index.ts` (add a branch inside the `charge.success` handler, before the existing `payments` lookup)

- [ ] **Step 1: Add the bill branch**

Inside `if (event.event === 'charge.success') {`, immediately after `const { reference, amount, paid_at, transaction } = event.data;`, insert:

```ts
      // Monthly bill payment? (references are BILL_<uuid>_<ts>)
      if (reference?.startsWith('BILL_')) {
        const { data: bill } = await supabase
          .from('monthly_bills')
          .select('id, status, tenant_id, period')
          .eq('paystack_reference', reference)
          .single();

        if (!bill) {
          console.error('Bill not found for reference:', reference);
          return new Response('Bill not found', { status: 404 });
        }
        if (bill.status === 'paid') {
          return new Response('Already processed', { status: 200, headers: corsHeaders });
        }

        await supabase
          .from('monthly_bills')
          .update({ status: 'paid', paid_at: paid_at ?? new Date().toISOString() })
          .eq('id', bill.id)
          .eq('status', 'sent'); // idempotency guard for duplicate deliveries

        await supabase.rpc('create_notification', {
          _user_id: bill.tenant_id,
          _message: `Payment confirmed — your ${bill.period} bill is settled. Receipt on its way.`,
          _link_url: '/enhancedtenantdashboard/payments',
          _type: 'payment',
          _metadata: { bill_id: bill.id },
        });

        // Receipt + emails + landlord notification + SwiftBooks (own function, retryable)
        const receiptRes = await fetch(`${supabaseUrl}/functions/v1/generate-rent-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (!receiptRes.ok) {
          console.error('Receipt generation failed (bill stays paid):', await receiptRes.text());
        }

        return new Response('Bill payment processed', { status: 200, headers: corsHeaders });
      }
```

- [ ] **Step 2: Confirm which webhook URL is registered**

In the Paystack dashboard (test mode settings), confirm the webhook URL points at `/functions/v1/paystack-webhook`. If it points at `paystack-webhook-handler` instead, apply the same branch there (the two functions are near-duplicates; extend the registered one).

- [ ] **Step 3: Deploy**

Run: `npx supabase functions deploy paystack-webhook`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/paystack-webhook/index.ts
git commit -m "feat(billing): handle monthly bill payments in Paystack webhook"
```

---

### Task 9: Shared billing hooks (client)

**Files:**
- Create: `packages/features/src/billing/hooks/useMonthlyBills.ts`
- Create: `packages/features/src/billing/hooks/useUnpaidBill.ts`
- Create: `packages/features/src/billing/index.ts`
- Modify: `packages/features/package.json` — only if exports are path-mapped; mirror how `./accounting` is exposed.

- [ ] **Step 1: Landlord-side hook**

```ts
// useMonthlyBills.ts — landlord's bills with line items
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';

export interface BillLineItemInput {
  category: 'water' | 'sewage' | 'electricity' | 'refuse' | 'other';
  label: string;
  amount: number;
}

export function useMonthlyBills() {
  const queryClient = useQueryClient();

  const billsQuery = useQuery({
    queryKey: ['monthly-bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*, properties(title, location), bill_line_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendBill = useMutation({
    mutationFn: async ({ billId, lineItems }: { billId: string; lineItems: BillLineItemInput[] }) => {
      const { data, error } = await supabase.functions.invoke('send-monthly-bill', {
        body: { billId, lineItems },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send bill');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthly-bills'] }),
  });

  return { billsQuery, sendBill };
}
```

- [ ] **Step 2: Tenant-side realtime hook**

```ts
// useUnpaidBill.ts — drives the persistent banner; realtime so it appears/clears instantly
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

export function useUnpaidBill() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unpaid-bill', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*, properties(title, location), bill_line_items(*)')
        .eq('status', 'sent')
        .order('sent_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data; // null when nothing unpaid
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('unpaid-bill-watch')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_bills', filter: `tenant_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['unpaid-bill', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}
```

- [ ] **Step 3: Barrel export**

```ts
// packages/features/src/billing/index.ts
export { useMonthlyBills } from './hooks/useMonthlyBills';
export type { BillLineItemInput } from './hooks/useMonthlyBills';
export { useUnpaidBill } from './hooks/useUnpaidBill';
```

- [ ] **Step 4: Typecheck**

Run: `npm run build` (or the workspace typecheck script) — expected: compiles.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/billing
git commit -m "feat(billing): client hooks for landlord bills and tenant unpaid-bill watch"
```

---

### Task 10: Landlord Payments page — billing due + bill form + history

**Files:**
- Create: `packages/features/src/billing/components/LandlordBillingPanel.tsx`
- Create: `packages/features/src/billing/components/BillExpenseForm.tsx`
- Modify: `apps/landlord/src/components/dashboard/LandlordDashboardRoutes.tsx:53-60` — replace the `LandlordPayments` "coming soon" stub body with `<LandlordBillingPanel />`
- Modify: `packages/features/src/billing/index.ts` — export both components

- [ ] **Step 1: Expense form**

```tsx
// BillExpenseForm.tsx
import { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Plus, Trash2 } from 'lucide-react';
import type { BillLineItemInput } from '../hooks/useMonthlyBills';

const PRESETS: { category: BillLineItemInput['category']; label: string }[] = [
  { category: 'water', label: 'Water' },
  { category: 'sewage', label: 'Sewage' },
  { category: 'electricity', label: 'Electricity' },
  { category: 'refuse', label: 'Refuse' },
];

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

interface Props {
  rentAmount: number;
  onSend: (lineItems: BillLineItemInput[]) => void;
  sending: boolean;
  sendBlockedReason?: string; // e.g. missing subaccount
}

export function BillExpenseForm({ rentAmount, onSend, sending, sendBlockedReason }: Props) {
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<{ label: string; amount: string }[]>([]);

  const lineItems: BillLineItemInput[] = [
    ...PRESETS.filter(p => Number(presets[p.category]) > 0)
      .map(p => ({ category: p.category, label: p.label, amount: Number(presets[p.category]) })),
    ...custom.filter(c => c.label.trim() && Number(c.amount) > 0)
      .map(c => ({ category: 'other' as const, label: c.label.trim(), amount: Number(c.amount) })),
  ];
  const total = rentAmount + lineItems.reduce((s, li) => s + li.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
        <span className="text-sm font-medium">Rent (from lease)</span>
        <span className="text-sm font-semibold">{fmtR(rentAmount)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(p => (
          <div key={p.category}>
            <Label htmlFor={`exp-${p.category}`}>{p.label}</Label>
            <Input
              id={`exp-${p.category}`} type="number" inputMode="decimal" min="0" placeholder="0.00"
              value={presets[p.category] ?? ''}
              onChange={e => setPresets(s => ({ ...s, [p.category]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {custom.map((c, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Charge</Label>
            <Input placeholder="e.g. Garden service" value={c.label}
              onChange={e => setCustom(cs => cs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
          </div>
          <div className="w-32">
            <Label>Amount</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0.00" value={c.amount}
              onChange={e => setCustom(cs => cs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCustom(cs => cs.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setCustom(cs => [...cs, { label: '', amount: '' }])}>
        <Plus className="h-4 w-4 mr-1" /> Add other charge
      </Button>

      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <span className="font-semibold">Total to tenant</span>
        <span className="text-lg font-bold">{fmtR(total)}</span>
      </div>

      {sendBlockedReason ? (
        <p className="text-sm text-destructive">{sendBlockedReason}</p>
      ) : null}
      <Button className="w-full" disabled={sending || !!sendBlockedReason} onClick={() => onSend(lineItems)}>
        {sending ? 'Sending…' : 'Send to tenant'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Billing panel**

```tsx
// LandlordBillingPanel.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useMonthlyBills } from '../hooks/useMonthlyBills';
import { BillExpenseForm } from './BillExpenseForm';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export function LandlordBillingPanel() {
  const { user } = useAuth();
  const { billsQuery, sendBill } = useMonthlyBills();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['landlord-subaccount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles').select('paystack_subaccount_code').eq('user_id', user!.id).single();
      return data;
    },
  });
  const hasSubaccount = !!profile?.paystack_subaccount_code;

  const bills = billsQuery.data ?? [];
  const drafts = bills.filter(b => b.status === 'awaiting_landlord');
  const rest = bills.filter(b => b.status !== 'awaiting_landlord');

  const propertyName = (b: any) => b.properties?.title || b.properties?.location || 'Property';

  const receiptUrl = (path: string) =>
    supabase.storage.from('rent-receipts').getPublicUrl(path).data.publicUrl;

  return (
    <div className="space-y-6">
      {drafts.map(bill => (
        <Card key={bill.id} className="border-primary">
          <CardHeader>
            <CardTitle>Billing due — {propertyName(bill)}</CardTitle>
            <CardDescription>
              {bill.period}: add this month's expenses, then send the bill to your tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillExpenseForm
              rentAmount={Number(bill.rent_amount)}
              sending={sendBill.isPending}
              sendBlockedReason={hasSubaccount ? undefined
                : 'Complete Rent Collection setup (bank details) before sending — the payment needs somewhere to go.'}
              onSend={(lineItems) =>
                sendBill.mutate({ billId: bill.id, lineItems }, {
                  onSuccess: () => toast({ title: 'Bill sent', description: 'Your tenant has been notified.' }),
                  onError: (e: Error) => toast({ title: 'Could not send', description: e.message, variant: 'destructive' }),
                })}
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Bills</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {billsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!billsQuery.isLoading && rest.length === 0 && drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bills yet. Two days before month-end you'll be asked for billing information here.
            </p>
          ) : null}
          {rest.map(bill => (
            <div key={bill.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{propertyName(bill)} — {bill.period}</p>
                <p className="text-xs text-muted-foreground">{fmtR(Number(bill.total_amount))}</p>
              </div>
              <div className="flex items-center gap-2">
                {bill.status === 'paid'
                  ? <Badge className="bg-green-600 text-white">Paid</Badge>
                  : <Badge variant="secondary">Sent — awaiting payment</Badge>}
                {bill.receipt_pdf_path ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={receiptUrl(bill.receipt_pdf_path)} target="_blank" rel="noreferrer">Receipt</a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Wire into the landlord app**

In `apps/landlord/src/components/dashboard/LandlordDashboardRoutes.tsx`, replace the `LandlordPayments` stub body (lines ~53–60) so it renders `<LandlordBillingPanel />` (import from `@mzanzihomes/features/billing`). Keep the surrounding `EnhancedDashboardLayout` route wiring untouched.

- [ ] **Step 4: Verify**

Run: `npm run dev` (landlord app), open Payments. Expected: "No bills yet…" empty state renders without errors.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/billing apps/landlord/src/components/dashboard/LandlordDashboardRoutes.tsx
git commit -m "feat(billing): landlord billing panel with expense form in Payments page"
```

---

### Task 11: Rent Collection tile (landlord dashboard)

**Files:**
- Create: `packages/features/src/billing/components/RentCollectionCard.tsx`
- Modify: `apps/landlord/src/pages/EnhancedLandlordDashboard.tsx` — register the tile where the ToolGrid `tools` array is built (search for `ToolGrid` usage; add a "Rent collection" tool item routing to the card/dialog)
- Modify: `packages/features/src/billing/index.ts` — export

- [ ] **Step 1: The card**

Reuse the exact bank-details UX from the lease flow: find the component the lease banking step uses (search `list-paystack-banks` under `packages/features/src/lease/components/`) and render the same bank picker + account fields here, submitting to `create-paystack-subaccount` with the same payload shape.

```tsx
// RentCollectionCard.tsx — shell around the reused banking form
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Landmark } from 'lucide-react';
// import { <LeaseBankingForm> } from '../../lease/components/<found in Step 1 search>';

export function RentCollectionCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['landlord-subaccount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles').select('paystack_subaccount_code').eq('user_id', user!.id).single();
      return data;
    },
  });
  const active = !!profile?.paystack_subaccount_code;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Landmark className="h-6 w-6 text-primary" />
        <div>
          <CardTitle className="text-base">Rent collection</CardTitle>
          <CardDescription>
            {isLoading ? 'Checking…' : active
              ? 'Active — rent is paid straight to your bank account'
              : 'Add your bank details so tenants can pay rent in-app'}
          </CardDescription>
        </div>
        {active ? <Badge className="ml-auto bg-green-600 text-white">Active</Badge>
                : <Badge className="ml-auto" variant="destructive">Set up</Badge>}
      </CardHeader>
      <CardContent>
        {/* Render the reused lease banking form when !active (inline or in a Dialog),
            onSuccess: invalidate ['landlord-subaccount', user.id] */}
      </CardContent>
    </Card>
  );
}
```

Also show the TEST MODE badge here (spec §1): call `supabase.functions.invoke('pay-monthly-bill', ...)` is not appropriate for this screen, so instead have `create-paystack-subaccount` include `test_mode: paystackSecretKey.startsWith('sk_test')` in its response, and render `<Badge className="bg-amber-500 text-white">TEST MODE</Badge>` next to the card title after setup runs — or simpler and preferred: read `import.meta.env.VITE_PAYSTACK_PUBLIC_KEY` and show the badge when it starts with `pk_test`.

- [ ] **Step 2: Register on the dashboard**

In `EnhancedLandlordDashboard.tsx`, add a "Rent collection" entry to the ToolGrid tools array (icon: `Landmark`), shown when the landlord has ≥1 property. Tapping navigates to a view rendering `RentCollectionCard` (or opens it in the existing dialog/sheet pattern used by other tools — match whichever pattern sibling tools use).

- [ ] **Step 3: Verify**

`npm run dev` (landlord app): with no subaccount the tile shows "Set up" red badge; completing bank details flips it to "Active" without reload.

- [ ] **Step 4: Commit**

```bash
git add packages/features/src/billing/components/RentCollectionCard.tsx apps/landlord/src/pages/EnhancedLandlordDashboard.tsx packages/features/src/billing/index.ts
git commit -m "feat(billing): rent collection setup tile on landlord dashboard"
```

---

### Task 12: Tenant red banner + bill detail + Pay now

**Files:**
- Create: `packages/features/src/billing/components/RentDueBanner.tsx`
- Create: `packages/features/src/billing/components/BillDetailSheet.tsx`
- Modify: `apps/tenant/src/App.tsx` — mount `<RentDueBanner />` inside the authenticated shell, above the routed content (it must render on every page; place it beside `MiniNavbar`/`MobileNetworkStatus` in the layout so it survives route changes)
- Modify: `packages/features/src/billing/index.ts` — export

- [ ] **Step 1: The banner (spec: red bar + white "Pay now" pill; bar → bill, pill → payment; persists until paid)**

```tsx
// RentDueBanner.tsx
import { useState } from 'react';
import { useUnpaidBill } from '../hooks/useUnpaidBill';
import { BillDetailSheet } from './BillDetailSheet';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export function RentDueBanner() {
  const { data: bill } = useUnpaidBill();
  const [open, setOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);

  if (!bill) return null;
  const monthName = new Date(`${bill.period}-01`).toLocaleDateString('en-ZA', { month: 'long' });

  return (
    <>
      <button
        onClick={() => { setPayNow(false); setOpen(true); }}
        className="sticky top-0 z-50 flex w-full items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-left text-white"
        aria-label={`Rent due ${fmtR(Number(bill.total_amount))} — view bill`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight">
            {monthName} rent &amp; utilities
          </span>
          <span className="block text-xs opacity-90">{fmtR(Number(bill.total_amount))} outstanding</span>
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); setPayNow(true); setOpen(true); }}
          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-red-600"
        >
          Pay now
        </span>
      </button>
      <BillDetailSheet bill={bill} open={open} onOpenChange={setOpen} autoPay={payNow} />
    </>
  );
}
```

- [ ] **Step 2: Bill detail + payment kickoff**

```tsx
// BillDetailSheet.tsx
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

interface Props {
  bill: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  autoPay?: boolean;
}

export function BillDetailSheet({ bill, open, onOpenChange, autoPay }: Props) {
  const [paying, setPaying] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const { toast } = useToast();

  const startPayment = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('pay-monthly-bill', {
        body: { billId: bill.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Could not start payment');
      setTestMode(!!data.test_mode);
      // Same checkout mechanism the app already uses (PaystackWebView / redirect):
      window.location.href = data.authorization_url;
    } catch (e) {
      toast({ title: 'Payment failed to start', description: (e as Error).message, variant: 'destructive' });
      setPaying(false);
    }
  };

  useEffect(() => {
    if (open && autoPay) void startPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPay]);

  const propertyName = bill.properties?.title || bill.properties?.location || 'your home';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {bill.period} bill
            {testMode ? <Badge className="bg-amber-500 text-white">TEST MODE</Badge> : null}
          </SheetTitle>
          <SheetDescription>{propertyName}</SheetDescription>
        </SheetHeader>
        <div className="space-y-2 py-4">
          <div className="flex justify-between text-sm">
            <span>Rent</span><span className="font-medium">{fmtR(Number(bill.rent_amount))}</span>
          </div>
          {(bill.bill_line_items ?? []).map((li: any) => (
            <div key={li.id} className="flex justify-between text-sm">
              <span>{li.label}</span><span className="font-medium">{fmtR(Number(li.amount))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total</span><span>{fmtR(Number(bill.total_amount))}</span>
          </div>
        </div>
        <Button className="w-full" size="lg" disabled={paying} onClick={startPayment}>
          {paying ? 'Opening secure checkout…' : `Pay ${fmtR(Number(bill.total_amount))}`}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
```

> Before finishing this task, check how the app currently opens Paystack checkout (`components/PaystackWebView.tsx` + `PaymentRedirectHandler` in `packages/features/src/payments`). If tenancy deposit payments open checkout in an in-app WebView, use the same component here instead of `window.location.href` — consistency wins. (Plan 3 will move iOS to a browser sheet for Apple Pay.)

- [ ] **Step 3: Mount the banner in the tenant app root**

In `apps/tenant/src/App.tsx`, render `<RentDueBanner />` (import from `@mzanzihomes/features/billing`) inside the providers, directly above the `<Routes>` output in the authenticated layout, so it shows on every page.

- [ ] **Step 4: Verify**

`npm run dev` (tenant app), with a `sent` bill seeded (see Task 14): red bar shows on dashboard, messages, profile — every route; tapping opens the sheet; "Pay now" jumps straight into checkout.

- [ ] **Step 5: Commit**

```bash
git add packages/features/src/billing apps/tenant/src/App.tsx
git commit -m "feat(billing): persistent tenant rent-due banner with bill sheet and Pay now"
```

---

### Task 13: Tenant POP tile — current bill + receipt history

**Files:**
- Modify: `apps/tenant/src/pages/tenant/TenantProofOfPayment.tsx` — add a "Bills & receipts" tab as the default; keep the existing upload flow as the second tab

- [ ] **Step 1: Add the tab**

The page already uses `Tabs`. Make the first tab "Bills & receipts":

```tsx
// Inside TenantProofOfPayment — new default tab content
// (add `useQuery` import and the query near the existing hooks)
const { data: bills = [] } = useQuery({
  queryKey: ['tenant-bills'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('monthly_bills')
      .select('*, properties(title, location), bill_line_items(*)')
      .order('period', { ascending: false });
    if (error) throw error;
    return data;
  },
});

const receiptUrl = (path: string) =>
  supabase.storage.from('rent-receipts').getPublicUrl(path).data.publicUrl;
```

```tsx
<TabsContent value="bills">
  {bills.filter(b => b.status === 'sent').map(bill => (
    <Card key={bill.id} className="border-red-300 mb-3">
      <CardHeader>
        <CardTitle className="text-base">Current bill — {bill.period}</CardTitle>
        <CardDescription>
          {new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })
            .format(Number(bill.total_amount))} outstanding
        </CardDescription>
      </CardHeader>
      {/* Reuse BillDetailSheet from @mzanzihomes/features/billing for the Pay flow */}
    </Card>
  ))}
  {bills.filter(b => b.status === 'paid').map(bill => (
    <div key={bill.id} className="flex items-center justify-between rounded-lg border px-4 py-3 mb-2">
      <div>
        <p className="text-sm font-medium">{bill.period} — {bill.properties?.title || bill.properties?.location}</p>
        <p className="text-xs text-muted-foreground">
          Paid {bill.paid_at ? new Date(bill.paid_at).toLocaleDateString('en-ZA') : ''}
        </p>
      </div>
      {bill.receipt_pdf_path ? (
        <Button variant="outline" size="sm" asChild>
          <a href={receiptUrl(bill.receipt_pdf_path)} target="_blank" rel="noreferrer">Receipt</a>
        </Button>
      ) : null}
    </div>
  ))}
</TabsContent>
```

Wire `TabsList` accordingly: `bills` (default, "Bills & receipts") and the existing upload tab ("Upload proof").

- [ ] **Step 2: Verify**

Tenant app → POP page: paid bill shows with working Receipt link; unpaid `sent` bill shows as "Current bill".

- [ ] **Step 3: Commit**

```bash
git add apps/tenant/src/pages/tenant/TenantProofOfPayment.tsx
git commit -m "feat(billing): POP page shows current bill and receipt history"
```

---

### Task 14: Test-mode configuration + end-to-end verification

**Files:**
- Modify: `.env.example` — add `VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx`
- No code beyond that; this task is configuration + verification.

- [ ] **Step 1: Set Paystack test secrets**

- Supabase dashboard → Edge Functions → secrets: set `PAYSTACK_SECRET_KEY` to the **test** secret key (`sk_test_...`) from the user's Paystack dashboard.
- Paystack dashboard (test mode) → Settings → Webhooks: point to `https://<project>.supabase.co/functions/v1/paystack-webhook`.

- [ ] **Step 2: Seed a test scenario**

In SQL editor: ensure one active tenancy exists between a test landlord and test tenant with `monthly_rent` set. Then force-create a draft bill (simulating the cron outside its window):

```sql
INSERT INTO public.monthly_bills (tenancy_id, property_id, landlord_id, tenant_id, period, rent_amount)
SELECT id, property_id, landlord_id, tenant_id, to_char(now(), 'YYYY-MM'), monthly_rent
FROM public.tenancies WHERE status = 'active' LIMIT 1;
```

- [ ] **Step 3: Walk the full flow and check every box**

1. Landlord app → Payments: "Billing due" card shows with rent pre-filled.
2. Without a subaccount: "Send to tenant" is blocked with the setup message; Rent Collection tile shows "Set up".
3. Complete Rent Collection with Paystack **test bank details** (Paystack test mode accepts any valid-format account); tile flips to "Active".
4. Enter Water 250, Electricity 400, custom "Garden service" 150 → total = rent + 800 → Send.
5. Tenant app: red banner appears on every route without reload (realtime).
6. Tap banner → bill sheet shows 4 lines + total. TEST MODE badge shows after starting payment.
7. Pay with Paystack test card `4084 0840 8408 4081` (any future expiry, any CVV, OTP `123456`).
8. Webhook fires: bill flips to `paid`; banner disappears on both apps without reload.
9. Both parties receive receipt emails (check Resend dashboard if inboxes are test addresses).
10. Landlord gets "Rent paid" notification; POP page shows the paid bill with a working receipt PDF; landlord Payments shows "Paid" + receipt.
11. SwiftBooks (landlord → accounting): income entries exist — "Rent" + "Utility recovery" × 2 + garden service, each described `(auto — bill …)`.
12. Re-run the Task 2 unit tests: `npm run test -- billingCycle` → PASS.

- [ ] **Step 4: Commit**

```bash
git add .env.example
git commit -m "chore(billing): document Paystack public key env; verified test-mode flow end-to-end"
```

---

## Plans 2–4 (separate documents, after this plan ships)

- **Plan 2 — Monetization:** `listing_payments` table, publish paywall, Paystack Plans + subscription webhooks, contact-only lead flow, PayFast retirement (spec §9).
- **Plan 3 — Apple Pay:** iOS checkout via browser sheet + deep-link return (spec §8).
- **Plan 4 — SwiftBooks redesign:** Calm-ledger overview (spec §7).

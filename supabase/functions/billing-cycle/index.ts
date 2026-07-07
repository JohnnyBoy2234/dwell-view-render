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

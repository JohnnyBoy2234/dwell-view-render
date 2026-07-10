import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

async function paystackGet(path: string, secretKey: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && body?.status, data: body?.data, message: body?.message };
}

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
    if (userError || !userData.user) throw new Error('Not authenticated');
    const user = userData.user;
    logStep('User authenticated', { userId: user.id });

    const { data: sub, error: subError } = await supabase
      .from('billing_subscriptions')
      .select('paystack_subscription_code, paystack_customer_code, status')
      .eq('user_id', user.id)
      .maybeSingle();
    if (subError) throw new Error(`Could not load subscription: ${subError.message}`);
    if (!sub) throw new Error('No subscription found for this account');
    if (sub.status === 'cancelled') throw new Error('Subscription is already cancelled');

    // Paystack's disable endpoint needs the subscription code AND its email_token.
    // The token isn't stored locally, so fetch the subscription from Paystack.
    let subscriptionCode: string | null = sub.paystack_subscription_code ?? null;
    let emailToken: string | null = null;

    if (subscriptionCode) {
      const { ok, data } = await paystackGet(`/subscription/${subscriptionCode}`, paystackSecretKey);
      if (ok) emailToken = data?.email_token ?? null;
      else logStep('Subscription lookup by code failed', { subscriptionCode });
    }

    if (!emailToken && sub.paystack_customer_code) {
      // Fall back to the customer record: covers subscriptions activated by
      // charge.success before subscription.create stored the code.
      const { ok, data } = await paystackGet(`/customer/${sub.paystack_customer_code}`, paystackSecretKey);
      if (ok) {
        const active = (data?.subscriptions ?? []).find(
          (s: any) => s.status === 'active' || s.status === 'non-renewing' || s.status === 'attention'
        );
        if (active) {
          subscriptionCode = active.subscription_code;
          emailToken = active.email_token ?? null;
        }
      }
    }

    if (subscriptionCode && emailToken) {
      const res = await fetch('https://api.paystack.co/subscription/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.status) {
        throw new Error(body?.message || 'Paystack could not disable the subscription');
      }
      logStep('Paystack subscription disabled', { subscriptionCode });
    } else {
      // Nothing to disable on Paystack (e.g. subscription record without a
      // Paystack counterpart) — still cancel locally so the account isn't stuck.
      logStep('No Paystack subscription found; cancelling locally only');
    }

    // Mirror the webhook's subscription.disable handling so the UI updates
    // immediately instead of waiting for the webhook round-trip.
    const { error: updateError } = await supabase
      .from('billing_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id);
    if (updateError) throw new Error(`Failed to update subscription: ${updateError.message}`);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: 'free', plan_status: 'cancelled', plan_last_synced: new Date().toISOString() })
      .eq('user_id', user.id);
    if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

    logStep('Subscription cancelled', { userId: user.id });
    return new Response(JSON.stringify({ success: true }), {
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

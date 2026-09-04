import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[REACTIVATE-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

async function paystackGet(path: string, secretKey: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && body?.status, data: body?.data, message: body?.message };
}

// Re-enables a subscription the landlord previously cancelled while it was still
// inside its paid period (Paystack status 'non-renewing'). Mirrors
// cancel-subscription but hits /subscription/enable and flips the local state
// back to active so billing resumes at the next cycle.
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

    // Find the subscription code + email_token, exactly as cancel does.
    let subscriptionCode: string | null = sub.paystack_subscription_code ?? null;
    let emailToken: string | null = null;
    let paystackStatus: string | null = null;

    if (subscriptionCode) {
      const { ok, data } = await paystackGet(`/subscription/${subscriptionCode}`, paystackSecretKey);
      if (ok) {
        emailToken = data?.email_token ?? null;
        paystackStatus = data?.status ?? null;
      } else {
        logStep('Subscription lookup by code failed', { subscriptionCode });
      }
    }

    if (!emailToken && sub.paystack_customer_code) {
      const { ok, data } = await paystackGet(`/customer/${sub.paystack_customer_code}`, paystackSecretKey);
      if (ok) {
        const s = (data?.subscriptions ?? []).find(
          (x: any) => x.status === 'non-renewing' || x.status === 'attention' || x.status === 'active'
        );
        if (s) {
          subscriptionCode = s.subscription_code;
          emailToken = s.email_token ?? null;
          paystackStatus = s.status ?? null;
        }
      }
    }

    // If Paystack already shows it active, nothing to enable — just sync local.
    if (subscriptionCode && emailToken && paystackStatus !== 'active') {
      const res = await fetch('https://api.paystack.co/subscription/enable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: subscriptionCode, token: emailToken }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.status) {
        throw new Error(body?.message || 'Paystack could not reactivate the subscription');
      }
      logStep('Paystack subscription enabled', { subscriptionCode });
    } else if (!subscriptionCode || !emailToken) {
      // No live Paystack subscription to re-enable (e.g. it already lapsed).
      // The landlord must start a fresh subscription via checkout.
      throw new Error('Your subscription has ended and can no longer be reactivated. Please subscribe again.');
    }

    const { error: updateError } = await supabase
      .from('billing_subscriptions')
      .update({ status: 'active' })
      .eq('user_id', user.id);
    if (updateError) throw new Error(`Failed to update subscription: ${updateError.message}`);

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: 'subscriber', plan_status: 'active', plan_last_synced: new Date().toISOString() })
      .eq('user_id', user.id);
    if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

    logStep('Subscription reactivated', { userId: user.id });
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

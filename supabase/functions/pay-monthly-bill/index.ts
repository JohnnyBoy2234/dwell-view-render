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
      .select('*')
      .eq('id', billId)
      .eq('tenant_id', user.id)
      .single();
    if (billError || !bill) throw new Error('Bill not found or access denied');
    if (bill.status !== 'sent') throw new Error(`Bill is not payable (status: ${bill.status})`);

    // Adjustment 1: Fetch landlord profile in separate query (no FK exists)
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('paystack_subaccount_code')
      .eq('user_id', bill.landlord_id)
      .single();
    const subaccount = landlordProfile?.paystack_subaccount_code;
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

    // Adjustment 2: Capture error and throw BEFORE returning authorization_url
    const { error: refError } = await supabase
      .from('monthly_bills')
      .update({ paystack_reference: reference })
      .eq('id', billId);
    if (refError) throw refError;

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

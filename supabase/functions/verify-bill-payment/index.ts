import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-BILL-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new Error('PAYSTACK_SECRET_KEY is not set');

    // Service-role client for privileged reads/writes (mirrors the webhook).
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Authenticate the caller (verify_jwt is on, but we still need the user id).
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !userData.user) throw new Error('Not authenticated');
    const user = userData.user;

    const { reference } = await req.json();
    if (!reference || typeof reference !== 'string' || !reference.startsWith('BILL_')) {
      throw new Error('Invalid or missing reference');
    }

    // BILL_<uuid>_<ts> — the bill id is segment [1].
    const billId = reference.split('_')[1];
    if (!billId) throw new Error('Could not parse bill id from reference');

    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('id, status, tenant_id, landlord_id, period, total_amount, paystack_reference, receipt_pdf_path')
      .eq('id', billId)
      .single();
    if (billError || !bill) throw new Error('Bill not found');

    // Only the bill's tenant or landlord may verify it.
    if (bill.tenant_id !== user.id && bill.landlord_id !== user.id) {
      return json({ success: false, error: 'Access denied' }, 403);
    }

    const billPayload = {
      id: bill.id,
      period: bill.period,
      total_amount: Number(bill.total_amount),
      status: bill.status,
    };

    // Idempotent fast path — already settled.
    if (bill.status === 'paid') {
      return json({ success: true, status: 'paid', bill: { ...billPayload, status: 'paid' } });
    }

    // Verify with Paystack — the webhook is unreliable, so this is the source of truth.
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { 'Authorization': `Bearer ${paystackSecret}` } }
    );
    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData?.status) {
      // Paystack couldn't be reached / unknown reference — treat as still pending.
      logStep('Paystack verify not ok', { httpOk: verifyRes.ok, message: verifyData?.message });
      return json({ success: true, status: 'pending' });
    }

    const txStatus = verifyData.data?.status as string | undefined;
    const paidAmount = verifyData.data?.amount as number | undefined;
    const expectedCents = Math.round(Number(bill.total_amount) * 100);

    if (txStatus === 'success') {
      if (typeof paidAmount === 'number' && paidAmount !== expectedCents) {
        logStep('Amount mismatch — not marking paid', {
          billId: bill.id, expectedCents, receivedCents: paidAmount,
        });
        return json({ success: false, error: 'Payment amount does not match the bill' }, 409);
      }

      const paidAt = verifyData.data?.paid_at ?? new Date().toISOString();

      // Mark paid, guarded on 'sent' for idempotency (mirrors the webhook).
      const { data: updated, error: updateError } = await supabase
        .from('monthly_bills')
        .update({ status: 'paid', paid_at: paidAt })
        .eq('id', bill.id)
        .eq('status', 'sent')
        .select('id');
      if (updateError) throw new Error('Failed to mark bill paid');

      if (updated && updated.length > 0) {
        // Tenant notification — same shape as the webhook.
        const { error: notifyError } = await supabase.rpc('create_notification', {
          _user_id: bill.tenant_id,
          _message: `Payment confirmed — your ${bill.period} bill is settled. Receipt on its way.`,
          _link_url: '/enhancedtenantdashboard/payments',
          _type: 'payment',
          _metadata: { bill_id: bill.id },
        });
        if (notifyError) logStep('Tenant notification failed (non-fatal)', { error: notifyError.message });

        // Receipt + emails + landlord notification + SwiftBooks (fire-and-forget).
        try {
          const receiptRes = await fetch(`${supabaseUrl}/functions/v1/generate-rent-receipt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ billId: bill.id }),
          });
          if (!receiptRes.ok) {
            logStep('Receipt generation failed (bill stays paid)', await receiptRes.text());
          }
        } catch (e) {
          logStep('Receipt generation threw (bill stays paid)', {
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      return json({ success: true, status: 'paid', bill: { ...billPayload, status: 'paid' } });
    }

    // pending / abandoned / failed-but-retryable → let the client keep polling briefly.
    logStep('Transaction not yet successful', { txStatus });
    return json({ success: true, status: 'pending' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return json({ success: false, error: msg }, 400);
  }
});

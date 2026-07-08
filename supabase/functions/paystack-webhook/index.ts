import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    // Use Web Crypto API to verify HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash !== signature) {
      throw new Error('Invalid signature');
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === 'charge.success') {
      const { reference, amount, paid_at, transaction } = event.data;

      // Monthly bill payment? (references are BILL_<uuid>_<ts>)
      if (reference?.startsWith('BILL_')) {
        // The reference column can be overwritten by a re-initialized checkout,
        // so resolve the bill by metadata first, then by parsing the reference,
        // and only then by the stored column.
        const metadataBillId = event.data.metadata?.bill_id as string | undefined;
        const parsedBillId = reference.split('_')[1];
        const billId = metadataBillId || parsedBillId;

        let bill = null;
        if (billId) {
          const { data } = await supabase
            .from('monthly_bills')
            .select('id, status, tenant_id, period, total_amount')
            .eq('id', billId)
            .single();
          bill = data;
        }
        if (!bill) {
          const { data } = await supabase
            .from('monthly_bills')
            .select('id, status, tenant_id, period, total_amount')
            .eq('paystack_reference', reference)
            .single();
          bill = data;
        }

        if (!bill) {
          console.error('Bill not found for reference:', reference);
          return new Response('Bill not found', { status: 404 });
        }
        if (bill.status === 'paid') {
          return new Response('Already processed', { status: 200, headers: corsHeaders });
        }

        // Verify the charged amount matches the bill before marking paid.
        const expectedCents = Math.round(Number(bill.total_amount) * 100);
        if (typeof amount === 'number' && amount !== expectedCents) {
          console.error('Bill amount mismatch — not marking paid', {
            billId: bill.id, expectedCents, receivedCents: amount, reference,
          });
          return new Response('Amount mismatch', { status: 200, headers: corsHeaders });
        }

        const { data: updated, error: updateError } = await supabase
          .from('monthly_bills')
          .update({ status: 'paid', paid_at: paid_at ?? new Date().toISOString() })
          .eq('id', bill.id)
          .eq('status', 'sent') // idempotency guard for duplicate deliveries
          .select('id');
        if (updateError) {
          console.error('Failed to mark bill paid:', updateError.message);
          return new Response('Update failed', { status: 500 });
        }
        if (!updated || updated.length === 0) {
          // Lost a concurrent race or bill not in 'sent' — nothing more to do.
          return new Response('Already processed', { status: 200, headers: corsHeaders });
        }

        const { error: notifyError } = await supabase.rpc('create_notification', {
          _user_id: bill.tenant_id,
          _message: `Payment confirmed — your ${bill.period} bill is settled. Receipt on its way.`,
          _link_url: '/enhancedtenantdashboard/payments',
          _type: 'payment',
          _metadata: { bill_id: bill.id },
        });
        if (notifyError) console.error('Bill payment notification failed (non-fatal):', notifyError.message);

        // Receipt + emails + landlord notification + SwiftBooks (own function, retryable).
        // Awaited so the edge runtime doesn't kill it, but failures never fail the webhook.
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

      // Find payment by reference
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('paystack_reference', reference)
        .single();

      if (!payment) {
        console.error('Payment not found for reference:', reference);
        return new Response('Payment not found', { status: 404 });
      }

      // Update payment
      await supabase
        .from('payments')
        .update({
          status: 'verified',
          paid_amount_cents: amount,
          paid_at: paid_at,
          gateway_tx_id: transaction,
          verification_confidence: 1.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // Award star for on-time/early payment
      const dueDate = new Date(payment.due_date);
      const paidDate = new Date(paid_at);
      const daysEarly = Math.floor((dueDate.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysEarly >= 0) {
        const year = paidDate.getFullYear();
        const month = paidDate.getMonth() + 1;

        await supabase
          .from('tenant_payment_stars')
          .insert({
            tenant_id: payment.tenant_id,
            payment_id: payment.id,
            year,
            month,
            payment_date: paid_at,
            was_early: daysEarly > 0,
            days_early: Math.max(0, daysEarly)
          });
      }

      // Notify both parties
      await supabase.rpc('create_notification', {
        _user_id: payment.tenant_id,
        _message: `Payment confirmed for ${payment.due_period_yyyymm}`,
        _link_url: '/enhancedtenantdashboard?tab=payments',
        _type: 'payment',
        _metadata: { payment_id: payment.id, star_awarded: daysEarly >= 0 }
      });

      await supabase.rpc('create_notification', {
        _user_id: payment.landlord_id,
        _message: `Payment received from tenant for ${payment.due_period_yyyymm}`,
        _link_url: '/enhancedlandlorddashboard?tab=payments',
        _type: 'payment',
        _metadata: { payment_id: payment.id }
      });

      // Log audit
      await supabase
        .from('payment_audit_logs')
        .insert({
          payment_id: payment.id,
          action: 'paystack_webhook',
          new_status: 'verified',
          payload: event.data
        });
    }

    return new Response('Webhook processed', { 
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

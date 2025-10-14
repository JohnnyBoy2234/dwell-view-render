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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

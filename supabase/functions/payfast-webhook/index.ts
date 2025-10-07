import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

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
    const payfastPassphrase = Deno.env.get('PAYFAST_PASSPHRASE')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const data: Record<string, string> = {};
    
    for (const [key, value] of formData.entries()) {
      data[key] = value.toString();
    }

    // Verify signature
    const signature = data['signature'];
    delete data['signature'];
    
    const paramString = Object.keys(data)
      .sort()
      .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
      .join('&');
    
    const hash = createHmac('md5', payfastPassphrase)
      .update(paramString)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid signature');
      return new Response('Invalid signature', { status: 400 });
    }

    // Handle successful payment
    if (data.payment_status === 'COMPLETE') {
      const { m_payment_id, amount_gross, payment_date } = data;

      // Find payment by reference
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('payfast_reference', m_payment_id)
        .single();

      if (!payment) {
        console.error('Payment not found for reference:', m_payment_id);
        return new Response('Payment not found', { status: 404 });
      }

      // Update payment
      await supabase
        .from('payments')
        .update({
          status: 'verified',
          paid_amount_cents: Math.round(parseFloat(amount_gross) * 100),
          paid_at: payment_date,
          gateway_tx_id: data.pf_payment_id,
          verification_confidence: 1.0,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      // Award star for on-time/early payment
      const dueDate = new Date(payment.due_date);
      const paidDate = new Date(payment_date);
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
            payment_date: payment_date,
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
          action: 'payfast_webhook',
          new_status: 'verified',
          payload: data
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

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);
    
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(today.getDate() + 1);

    // Find payments due in 3 days (first reminder)
    const { data: upcomingPayments } = await supabase
      .from('payments')
      .select(`
        *,
        tenancies!inner(
          reference_code,
          properties!inner(title, location)
        )
      `)
      .eq('status', 'pending')
      .gte('due_date', threeDaysFromNow.toISOString().split('T')[0])
      .lt('due_date', new Date(threeDaysFromNow.getTime() + 86400000).toISOString().split('T')[0]);

    // Send 3-day reminders
    for (const payment of upcomingPayments || []) {
      await supabase.rpc('create_notification', {
        _user_id: payment.tenant_id,
        _message: `Rent payment due in 3 days - ${payment.tenancies.properties.title || payment.tenancies.properties.location}`,
        _link_url: '/enhancedtenantdashboard?tab=payments',
        _type: 'payment',
        _metadata: { 
          payment_id: payment.id,
          reminder_type: '3_day',
          amount: payment.expected_amount_cents / 100
        }
      });
    }

    // Find payments due tomorrow (second reminder)
    const { data: tomorrowPayments } = await supabase
      .from('payments')
      .select(`
        *,
        tenancies!inner(
          reference_code,
          properties!inner(title, location)
        )
      `)
      .eq('status', 'pending')
      .gte('due_date', oneDayFromNow.toISOString().split('T')[0])
      .lt('due_date', new Date(oneDayFromNow.getTime() + 86400000).toISOString().split('T')[0]);

    // Send 1-day reminders
    for (const payment of tomorrowPayments || []) {
      await supabase.rpc('create_notification', {
        _user_id: payment.tenant_id,
        _message: `⚠️ Rent payment due tomorrow - ${payment.tenancies.properties.title || payment.tenancies.properties.location}`,
        _link_url: '/enhancedtenantdashboard?tab=payments',
        _type: 'payment',
        _metadata: { 
          payment_id: payment.id,
          reminder_type: '1_day',
          amount: payment.expected_amount_cents / 100
        }
      });
    }

    // Find overdue payments
    const { data: overduePayments } = await supabase
      .from('payments')
      .select(`
        *,
        tenancies!inner(
          reference_code,
          properties!inner(title, location)
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', today.toISOString().split('T')[0]);

    // Update status to overdue and notify
    for (const payment of overduePayments || []) {
      await supabase
        .from('payments')
        .update({ status: 'overdue' })
        .eq('id', payment.id);

      await supabase.rpc('create_notification', {
        _user_id: payment.tenant_id,
        _message: `🚨 Payment overdue - ${payment.tenancies.properties.title || payment.tenancies.properties.location}`,
        _link_url: '/enhancedtenantdashboard?tab=payments',
        _type: 'payment',
        _metadata: { 
          payment_id: payment.id,
          reminder_type: 'overdue',
          amount: payment.expected_amount_cents / 100
        }
      });

      // Notify landlord too
      await supabase.rpc('create_notification', {
        _user_id: payment.landlord_id,
        _message: `Payment overdue from tenant - ${payment.tenancies.properties.title || payment.tenancies.properties.location}`,
        _link_url: '/enhancedlandlorddashboard?tab=payments',
        _type: 'payment',
        _metadata: { 
          payment_id: payment.id,
          status: 'overdue'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      reminders_sent: {
        three_day: upcomingPayments?.length || 0,
        one_day: tomorrowPayments?.length || 0,
        overdue: overduePayments?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

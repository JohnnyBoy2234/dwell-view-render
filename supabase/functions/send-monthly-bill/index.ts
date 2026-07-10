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
      .select('*')
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
      if (!li || typeof li !== 'object' || typeof li.category !== 'string') throw new Error('Invalid line item');
      if (!Number.isFinite(li.amount) || li.amount <= 0 || li.amount > 99999999.99) {
        throw new Error(`Invalid amount for ${li.category}`);
      }
      li.amount = Math.round(li.amount * 100) / 100;
      if (!['water','sewage','electricity','refuse','other'].includes(li.category)) {
        throw new Error(`Invalid category: ${li.category}`);
      }
      if (li.category === 'other' && !li.label?.trim()) {
        throw new Error('Custom charges need a label');
      }
    }

    const total = Number(bill.rent_amount) + items.reduce((s, li) => s + li.amount, 0);

    const { data: updated, error: updateError } = await supabase
      .from('monthly_bills')
      .update({ status: 'sent', total_amount: total, sent_at: new Date().toISOString() })
      .eq('id', billId)
      .eq('status', 'awaiting_landlord')
      .select('id');
    if (updateError) throw updateError;
    if (!updated || updated.length === 0) {
      throw new Error('Bill has already been sent');
    }

    if (items.length > 0) {
      // Status is already 'sent'; a failure here leaves a sent bill without its
      // line items (no cross-table transaction from the edge runtime). Accepted:
      // rent_amount/total_amount on the bill remain authoritative for payment.
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

    // No tenant notification here by design — the persistent rent-due banner
    // (driven by the bill row itself) is the tenant's prompt to pay.
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

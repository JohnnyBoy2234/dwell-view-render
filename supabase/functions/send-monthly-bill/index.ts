import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[SEND-MONTHLY-BILL] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const fmtR = (n: number) => `R${Number(n).toFixed(2)}`;

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
      .select('*, properties(title, location)')
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

    // ---- Invoice PDF (best effort — the bill is already sent, so a PDF
    // failure must never fail the send; the tenant can still pay) ----
    try {
      const { data: landlordProfile } = await supabase
        .from('profiles').select('display_name').eq('user_id', bill.landlord_id).single();
      const { data: tenantProfile } = await supabase
        .from('profiles').select('display_name').eq('user_id', bill.tenant_id).single();

      const pdf = await PDFDocument.create();
      const page = pdf.addPage([595, 842]); // A4
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const propertyName = bill.properties?.title || bill.properties?.location || 'Property';
      let y = 780;
      const draw = (text: string, opts: { x?: number; size?: number; isBold?: boolean } = {}) => {
        page.drawText(text, {
          x: opts.x ?? 60, y, size: opts.size ?? 11,
          font: opts.isBold ? bold : font, color: rgb(0.1, 0.1, 0.15),
        });
      };

      draw('MzanziHomes — Rent Invoice', { size: 18, isBold: true }); y -= 20;
      draw(`Invoice #: ${bill.id.slice(0, 8).toUpperCase()}-${bill.period}`, { size: 10 }); y -= 14;
      draw(`Issued: ${new Date().toLocaleDateString('en-ZA')}`, { size: 10 }); y -= 28;
      draw(`Property: ${propertyName}`, { isBold: true }); y -= 16;
      draw(`Period: ${bill.period}`); y -= 16;
      draw(`Tenant: ${tenantProfile?.display_name ?? ''}`); y -= 16;
      draw(`Landlord: ${landlordProfile?.display_name ?? ''}`); y -= 30;

      draw('Item', { isBold: true }); draw('Amount', { x: 440, isBold: true }); y -= 18;
      draw('Rent'); draw(fmtR(Number(bill.rent_amount)), { x: 440 }); y -= 16;
      for (const li of items) {
        const label = li.label?.trim() || li.category.charAt(0).toUpperCase() + li.category.slice(1);
        draw(label); draw(fmtR(li.amount), { x: 440 }); y -= 16;
      }
      y -= 8;
      draw('Total due', { isBold: true }); draw(fmtR(total), { x: 440, isBold: true });

      const pdfBytes = await pdf.save();
      const fileName = `${bill.landlord_id}/${bill.id}_invoice.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('rent-receipts')
        .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { error: pathError } = await supabase
        .from('monthly_bills')
        .update({ invoice_pdf_path: fileName })
        .eq('id', billId);
      if (pathError) throw pathError;
      logStep('Invoice generated', { billId, fileName });
    } catch (invoiceError) {
      logStep('Invoice generation failed (non-fatal)', {
        billId,
        error: invoiceError instanceof Error ? invoiceError.message : String(invoiceError),
      });
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

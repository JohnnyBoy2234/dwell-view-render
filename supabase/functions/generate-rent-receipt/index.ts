import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[GENERATE-RENT-RECEIPT] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const fmtR = (n: number) => `R${Number(n).toFixed(2)}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { billId } = await req.json();
    if (!billId) throw new Error('Missing billId');

    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*, properties(title, location), bill_line_items(*)')
      .eq('id', billId)
      .single();
    if (billError || !bill) throw new Error('Bill not found');
    if (bill.status !== 'paid') throw new Error('Bill is not paid');
    if (bill.receipt_pdf_path) {
      logStep('Receipt already exists — skipping (idempotent)');
      return new Response(JSON.stringify({ success: true, already: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Party names — profiles has display_name, email fetched from auth
    const { data: landlordProfile } = await supabase
      .from('profiles').select('display_name').eq('user_id', bill.landlord_id).single();
    const { data: tenantProfile } = await supabase
      .from('profiles').select('display_name').eq('user_id', bill.tenant_id).single();

    // Fetch emails from auth.users via admin API
    const adminAuthClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );
    const { data: landlordAuth } = await adminAuthClient.auth.admin.getUserById(bill.landlord_id);
    const { data: tenantAuth } = await adminAuthClient.auth.admin.getUserById(bill.tenant_id);
    const landlordEmail = landlordAuth?.user?.email;
    const tenantEmail = tenantAuth?.user?.email;

    // ---- Build PDF ----
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

    draw('MzanziHomes — Rent Receipt', { size: 18, isBold: true }); y -= 20;
    draw(`Receipt #: ${bill.id.slice(0, 8).toUpperCase()}-${bill.period}`, { size: 10 }); y -= 14;
    draw(`Paid: ${new Date(bill.paid_at).toLocaleDateString('en-ZA')}`, { size: 10 }); y -= 14;
    draw(`Paystack ref: ${bill.paystack_reference}`, { size: 10 }); y -= 28;
    draw(`Property: ${propertyName}`, { isBold: true }); y -= 16;
    draw(`Period: ${bill.period}`); y -= 16;
    draw(`Tenant: ${tenantProfile?.display_name ?? ''}`); y -= 16;
    draw(`Landlord: ${landlordProfile?.display_name ?? ''}`); y -= 30;

    draw('Item', { isBold: true }); draw('Amount', { x: 440, isBold: true }); y -= 18;
    draw('Rent'); draw(fmtR(bill.rent_amount), { x: 440 }); y -= 16;
    for (const li of bill.bill_line_items ?? []) {
      draw(li.label); draw(fmtR(li.amount), { x: 440 }); y -= 16;
    }
    y -= 8;
    draw('Total paid', { isBold: true }); draw(fmtR(bill.total_amount), { x: 440, isBold: true });

    const pdfBytes = await pdf.save();

    // ---- Upload ----
    const fileName = `${bill.landlord_id}/${bill.id}_receipt.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('rent-receipts')
      .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('rent-receipts').getPublicUrl(fileName);

    // Persist receipt_pdf_path (load-bearing for idempotency)
    const { error: pathError } = await supabase
      .from('monthly_bills')
      .update({ receipt_pdf_path: fileName })
      .eq('id', billId);
    if (pathError) throw pathError;

    // ---- Invoice backfill (best effort) ----
    // Bills sent before invoice generation existed in send-monthly-bill have no
    // invoice yet; create one now so the paid bill shows Invoice + Receipt together.
    let invoicePath: string | null = bill.invoice_pdf_path ?? null;
    if (!bill.invoice_pdf_path) {
      try {
        const invoicePdf = await PDFDocument.create();
        const invoicePage = invoicePdf.addPage([595, 842]); // A4
        const iFont = await invoicePdf.embedFont(StandardFonts.Helvetica);
        const iBold = await invoicePdf.embedFont(StandardFonts.HelveticaBold);
        let iy = 780;
        const idraw = (text: string, opts: { x?: number; size?: number; isBold?: boolean } = {}) => {
          invoicePage.drawText(text, {
            x: opts.x ?? 60, y: iy, size: opts.size ?? 11,
            font: opts.isBold ? iBold : iFont, color: rgb(0.1, 0.1, 0.15),
          });
        };

        idraw('MzanziHomes — Rent Invoice', { size: 18, isBold: true }); iy -= 20;
        idraw(`Invoice #: ${bill.id.slice(0, 8).toUpperCase()}-${bill.period}`, { size: 10 }); iy -= 14;
        idraw(`Issued: ${new Date(bill.sent_at ?? bill.created_at).toLocaleDateString('en-ZA')}`, { size: 10 }); iy -= 28;
        idraw(`Property: ${propertyName}`, { isBold: true }); iy -= 16;
        idraw(`Period: ${bill.period}`); iy -= 16;
        idraw(`Tenant: ${tenantProfile?.display_name ?? ''}`); iy -= 16;
        idraw(`Landlord: ${landlordProfile?.display_name ?? ''}`); iy -= 30;

        idraw('Item', { isBold: true }); idraw('Amount', { x: 440, isBold: true }); iy -= 18;
        idraw('Rent'); idraw(fmtR(bill.rent_amount), { x: 440 }); iy -= 16;
        for (const li of bill.bill_line_items ?? []) {
          idraw(li.label); idraw(fmtR(li.amount), { x: 440 }); iy -= 16;
        }
        iy -= 8;
        idraw('Total due', { isBold: true }); idraw(fmtR(bill.total_amount), { x: 440, isBold: true });

        const invoiceBytes = await invoicePdf.save();
        const invoiceFileName = `${bill.landlord_id}/${bill.id}_invoice.pdf`;
        const { error: invoiceUploadError } = await supabase.storage
          .from('rent-receipts')
          .upload(invoiceFileName, invoiceBytes, { contentType: 'application/pdf', upsert: true });
        if (invoiceUploadError) throw invoiceUploadError;
        const { error: invoicePathError } = await supabase
          .from('monthly_bills')
          .update({ invoice_pdf_path: invoiceFileName })
          .eq('id', billId);
        if (invoicePathError) throw invoicePathError;
        invoicePath = invoiceFileName;
        logStep('Invoice backfilled', { billId, invoiceFileName });
      } catch (invoiceError) {
        logStep('Invoice backfill failed (non-fatal)', {
          billId,
          error: invoiceError instanceof Error ? invoiceError.message : String(invoiceError),
        });
      }
    }

    // ---- Email both parties (best effort — never throw past this point) ----
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resend = new Resend(resendKey);
      const from = `MzanziHomes <${Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@MzanziHomes.co'}>`;
      const subject = `Rent receipt — ${propertyName}, ${bill.period}`;
      const invoiceUrl = invoicePath
        ? supabase.storage.from('rent-receipts').getPublicUrl(invoicePath).data.publicUrl
        : null;
      const html = `<p>Payment of <strong>${fmtR(bill.total_amount)}</strong> for ${propertyName} (${bill.period}) has been received.</p><p><a href="${urlData.publicUrl}">Download receipt (PDF)</a></p>${invoiceUrl ? `<p><a href="${invoiceUrl}">Download invoice (PDF)</a></p>` : ''}`;
      for (const to of [tenantEmail, landlordEmail]) {
        if (!to) continue;
        const { error: emailError } = await resend.emails.send({ from, to: [to], subject, html });
        if (emailError) logStep('Email failed (non-fatal)', { to, error: emailError });
      }
    }

    // ---- Landlord notification ----
    const { error: notifyError } = await supabase.rpc('create_notification', {
      _user_id: bill.landlord_id,
      _message: `Rent paid — ${fmtR(bill.total_amount)} received for ${propertyName} (${bill.period}). View receipt.`,
      _link_url: '/enhancedlandlorddashboard/payments',
      _type: 'payment',
      _metadata: { bill_id: bill.id, receipt_path: fileName },
    });
    if (notifyError) logStep('Notification failed (non-fatal)', { billId, error: notifyError.message });

    // ---- SwiftBooks auto-entries (income: rent + each recovered utility) ----
    const paidDate = new Date(bill.paid_at).toISOString().split('T')[0];
    const entries = [
      {
        user_id: bill.landlord_id, property_id: bill.property_id, type: 'income',
        date: paidDate, amount: bill.rent_amount, vat_percent: 0,
        category: 'Rent', vendor: 'Tenant',
        description: `Rent ${bill.period} (auto — bill ${bill.id.slice(0, 8)})`,
      },
      ...(bill.bill_line_items ?? []).map((li: { label: string; amount: number }) => ({
        user_id: bill.landlord_id, property_id: bill.property_id, type: 'income',
        date: paidDate, amount: li.amount, vat_percent: 0,
        category: 'Utility recovery', vendor: 'Tenant',
        description: `${li.label} ${bill.period} (auto — bill ${bill.id.slice(0, 8)})`,
      })),
    ];
    const { error: txnError } = await supabase.from('transactions').insert(entries);
    if (txnError) logStep('SwiftBooks insert failed (non-fatal)', { error: txnError.message });

    logStep('Receipt complete', { billId, fileName });
    return new Response(JSON.stringify({ success: true, receipt_url: urlData.publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

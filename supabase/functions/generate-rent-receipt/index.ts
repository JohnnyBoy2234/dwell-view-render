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

// "R 12 345.67" — same presentation as the accounting invoice generator's
// en-ZA toLocaleString, but built by hand so the output only contains
// WinAnsi-encodable characters (Helvetica in pdf-lib can't draw the narrow
// no-break spaces some locales emit).
const fmtR = (n: number) => {
  const [int, dec] = Number(n).toFixed(2).split('.');
  return `R ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}.${dec}`;
};

// Palette lifted from the accounting Tax Invoice PDF
// (packages/features/src/accounting/components/PDFGenerator.tsx) so rent
// receipts/invoices and accounting invoices look like the same family of
// documents. Kept in sync with send-monthly-bill/index.ts.
const SKY = rgb(14 / 255, 165 / 255, 233 / 255); // #0ea5e9 brand
const INK = rgb(55 / 255, 65 / 255, 81 / 255); // #374151 body text
const MUTED = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280 secondary
const BORDER = rgb(209 / 255, 213 / 255, 219 / 255); // #d1d5db table header border
const ROW_LINE = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb row divider
const BAND_BG = rgb(243 / 255, 244 / 255, 246 / 255); // #f3f4f6 table header band

const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

interface BillPdfData {
  kind: 'invoice' | 'receipt';
  billId: string;
  period: string;
  propertyName: string;
  landlordName: string;
  tenantName: string;
  rentAmount: number;
  items: { label: string; amount: number }[];
  total: number;
  dateLabel: string; // e.g. "Date: 12/07/2026" or "Paid: 12/07/2026"
  paystackRef?: string;
}

async function renderBillPdf(doc: BillPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 40; // page margin
  const R = 595 - M; // right edge of content

  const text = (str: string, x: number, y: number, size = 10, f = font, color = INK) =>
    page.drawText(str, { x, y, size, font: f, color });
  const rightText = (str: string, y: number, size = 10, f = font, color = INK, xr = R) =>
    text(str, xr - f.widthOfTextAtSize(str, size), y, size, f, color);
  const rule = (y: number, thickness: number, color: ReturnType<typeof rgb>, x1 = M, x2 = R) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });

  // Header — brand name left, document type right, sky rule underneath
  text('MzanziHomes', M, 782, 12, bold, SKY);
  rightText(doc.kind === 'receipt' ? 'RECEIPT' : 'INVOICE', 776, 24, bold, SKY);
  rule(762, 2, SKY);

  // From / To columns
  const colTo = 320;
  text('From:', M, 726, 13, bold);
  text(doc.landlordName, M, 708, 11, bold);
  text('To:', colTo, 726, 13, bold);
  text(doc.tenantName, colTo, 708, 11, bold);
  text(doc.propertyName, colTo, 693, 9, font, MUTED);

  // Document info row
  const number = `${doc.billId.slice(0, 8).toUpperCase()}-${doc.period}`;
  const periodLabel = new Date(`${doc.period}-01T00:00:00`).toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });
  text(`${doc.kind === 'receipt' ? 'Receipt' : 'Invoice'} Number: ${number}`, M, 660, 11, bold);
  text(doc.dateLabel, M, 645, 11);
  if (doc.paystackRef) text(`Paystack ref: ${doc.paystackRef}`, M, 630, 9, font, MUTED);
  rightText(`Property: ${doc.propertyName}`, 660, 11);
  rightText(`Billing period: ${periodLabel}`, 645, 11);

  // Line-item table — grey header band, hairline row dividers
  let y = 600;
  page.drawRectangle({ x: M, y: y - 9, width: R - M, height: 27, color: BAND_BG });
  rule(y - 9, 1, BORDER);
  text('Description', M + 8, y, 10, bold);
  rightText('Amount', y, 10, bold, INK, R - 8);
  y -= 27;

  const rows = [{ label: `Rent — ${periodLabel}`, amount: doc.rentAmount }, ...doc.items];
  for (const row of rows) {
    text(row.label, M + 8, y, 10);
    rightText(fmtR(row.amount), y, 10, font, INK, R - 8);
    rule(y - 8, 0.5, ROW_LINE);
    y -= 24;
  }

  // Total — right-aligned block with dark top rule
  y -= 6;
  rule(y + 16, 2, INK, R - 200, R);
  text(doc.kind === 'receipt' ? 'Total paid:' : 'Total due:', R - 200, y, 12, bold);
  rightText(fmtR(doc.total), y, 12, bold);

  // Payment section
  y -= 44;
  text('Payment', M, y, 13, bold);
  text(
    doc.kind === 'receipt'
      ? 'Paid in full via Paystack - thank you.'
      : 'Pay securely in the MzanziHomes app - open your dashboard and tap "Pay now".',
    M, y - 16, 10
  );
  text(`Reference: ${number}`, M, y - 30, 10, font, MUTED);

  const footer = 'mzanzihomes.com - Safe, Simple, Commission-Free Renting';
  text(footer, (595 - font.widthOfTextAtSize(footer, 10)) / 2, 40, 10, font, MUTED);

  return pdf.save();
}

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
    const propertyName = bill.properties?.title || bill.properties?.location || 'Property';
    const lineItems = (bill.bill_line_items ?? []).map((li: { label: string; amount: number }) => ({
      label: li.label,
      amount: Number(li.amount),
    }));
    const pdfBytes = await renderBillPdf({
      kind: 'receipt',
      billId: bill.id,
      period: bill.period,
      propertyName,
      landlordName: landlordProfile?.display_name || 'Landlord',
      tenantName: tenantProfile?.display_name || 'Tenant',
      rentAmount: Number(bill.rent_amount),
      items: lineItems,
      total: Number(bill.total_amount),
      dateLabel: `Paid: ${fmtDate(new Date(bill.paid_at))}`,
      paystackRef: bill.paystack_reference ?? undefined,
    });

    // ---- Upload ----
    // Filename leads with the billing period so a saved/downloaded file is
    // dated (e.g. receipt_2026-01_<id>.pdf). Still unique + stable per bill.
    const fileName = `${bill.landlord_id}/receipt_${bill.period}_${bill.id}.pdf`;
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
        const invoiceBytes = await renderBillPdf({
          kind: 'invoice',
          billId: bill.id,
          period: bill.period,
          propertyName,
          landlordName: landlordProfile?.display_name || 'Landlord',
          tenantName: tenantProfile?.display_name || 'Tenant',
          rentAmount: Number(bill.rent_amount),
          items: lineItems,
          total: Number(bill.total_amount),
          dateLabel: `Date: ${fmtDate(new Date(bill.sent_at ?? bill.created_at))}`,
        });
        const invoiceFileName = `${bill.landlord_id}/invoice_${bill.period}_${bill.id}.pdf`;
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

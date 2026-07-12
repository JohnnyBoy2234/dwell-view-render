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
// invoices and accounting invoices look like the same family of documents.
const SKY = rgb(14 / 255, 165 / 255, 233 / 255); // #0ea5e9 brand
const INK = rgb(55 / 255, 65 / 255, 81 / 255); // #374151 body text
const MUTED = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280 secondary
const BORDER = rgb(209 / 255, 213 / 255, 219 / 255); // #d1d5db table header border
const ROW_LINE = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb row divider
const BAND_BG = rgb(243 / 255, 244 / 255, 246 / 255); // #f3f4f6 table header band

interface InvoiceData {
  billId: string;
  period: string;
  propertyName: string;
  landlordName: string;
  tenantName: string;
  rentAmount: number;
  items: { label: string; amount: number }[];
  total: number;
}

async function renderInvoicePdf(inv: InvoiceData): Promise<Uint8Array> {
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

  // Header — brand name left, INVOICE right, sky rule underneath
  text('MzanziHomes', M, 782, 12, bold, SKY);
  rightText('INVOICE', 776, 24, bold, SKY);
  rule(762, 2, SKY);

  // From / To columns
  const colTo = 320;
  text('From:', M, 726, 13, bold);
  text(inv.landlordName, M, 708, 11, bold);
  text('To:', colTo, 726, 13, bold);
  text(inv.tenantName, colTo, 708, 11, bold);
  text(inv.propertyName, colTo, 693, 9, font, MUTED);

  // Invoice info row
  const issued = new Date();
  const issuedLabel = `${String(issued.getDate()).padStart(2, '0')}/${String(issued.getMonth() + 1).padStart(2, '0')}/${issued.getFullYear()}`;
  const periodLabel = new Date(`${inv.period}-01T00:00:00`).toLocaleDateString('en-ZA', {
    month: 'long',
    year: 'numeric',
  });
  const invoiceNo = `${inv.billId.slice(0, 8).toUpperCase()}-${inv.period}`;
  text(`Invoice Number: ${invoiceNo}`, M, 660, 11, bold);
  text(`Date: ${issuedLabel}`, M, 645, 11);
  rightText(`Property: ${inv.propertyName}`, 660, 11);
  rightText(`Billing period: ${periodLabel}`, 645, 11);

  // Line-item table — grey header band, hairline row dividers
  let y = 608;
  page.drawRectangle({ x: M, y: y - 9, width: R - M, height: 27, color: BAND_BG });
  rule(y - 9, 1, BORDER);
  text('Description', M + 8, y, 10, bold);
  rightText('Amount', y, 10, bold, INK, R - 8);
  y -= 27;

  const rows = [{ label: `Rent — ${periodLabel}`, amount: inv.rentAmount }, ...inv.items];
  for (const row of rows) {
    text(row.label, M + 8, y, 10);
    rightText(fmtR(row.amount), y, 10, font, INK, R - 8);
    rule(y - 8, 0.5, ROW_LINE);
    y -= 24;
  }

  // Total — right-aligned block with dark top rule
  y -= 6;
  rule(y + 16, 2, INK, R - 200, R);
  text('Total due:', R - 200, y, 12, bold);
  rightText(fmtR(inv.total), y, 12, bold);

  // Payment note (rent is paid in-app via Paystack, not by EFT)
  y -= 44;
  text('Payment', M, y, 13, bold);
  text('Pay securely in the MzanziHomes app - open your dashboard and tap "Pay now".', M, y - 16, 10);
  text(`Reference: ${invoiceNo}`, M, y - 30, 10, font, MUTED);

  const footer = 'mzanzihomes.com - Safe, Simple, Commission-Free Renting';
  text(footer, (595 - font.widthOfTextAtSize(footer, 10)) / 2, 40, 10, font, MUTED);

  return pdf.save();
}

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

      const pdfBytes = await renderInvoicePdf({
        billId: bill.id,
        period: bill.period,
        propertyName: bill.properties?.title || bill.properties?.location || 'Property',
        landlordName: landlordProfile?.display_name || 'Landlord',
        tenantName: tenantProfile?.display_name || 'Tenant',
        rentAmount: Number(bill.rent_amount),
        items: items.map(li => ({
          label: li.label?.trim() || li.category.charAt(0).toUpperCase() + li.category.slice(1),
          amount: li.amount,
        })),
        total,
      });
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

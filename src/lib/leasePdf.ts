import { supabase } from '@/integrations/supabase/client';
import { downloadFileFromUrl } from '@/lib/download';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function ensureDraftPdfUrl(leaseId: string): Promise<string> {
  // 1) Try existing draft/signed URLs
  const { data: lease } = await supabase
    .from('leases')
    .select('id, pdf_draft_url, pdf_signed_url, lease_data')
    .eq('id', leaseId)
    .maybeSingle();

  const existing = lease?.pdf_draft_url || lease?.pdf_signed_url;
  if (existing) return existing;

  // 2) Try stored storage path -> mint fresh signed URL
  const path: string | undefined = lease?.lease_data?.pdf?.finalPath;
  if (path) {
    const { data: s, error } = await supabase
      .storage
      .from('lease-documents')
      .createSignedUrl(path, 60 * 60); // 1 hour
    if (!error && s?.signedUrl) {
      // Best effort persist draft url
      await supabase.from('leases').update({ pdf_draft_url: s.signedUrl }).eq('id', leaseId);
      return s.signedUrl;
    }
  }

  // 3) As last resort, generate via edge function (may require service role setup)
  if (lease?.lease_data) {
    const { data: genResp, error: genErr }: any = await supabase.functions.invoke('lease-pack-generate', {
      body: { leasePack: lease.lease_data }
    });
    if (!genErr && genResp?.success && genResp?.pdf_url) {
      await supabase.from('leases').update({
        pdf_draft_url: genResp.pdf_url,
        lease_data: {
          ...lease.lease_data,
          pdf: { ...(lease.lease_data.pdf || {}), finalPath: genResp.pdf_path }
        }
      }).eq('id', leaseId);
      return genResp.pdf_url as string;
    }

    // 4) Absolute fallback: generate a lightweight preview PDF in-browser
    try {
      const pdfUrl = await generateLocalDraftPdf(lease.lease_data);
      // Persist best-effort (data URLs are ephemeral; we still save so subsequent flows can reuse within session)
      await supabase.from('leases').update({ pdf_draft_url: pdfUrl }).eq('id', leaseId);
      return pdfUrl;
    } catch {
      // bubble up
    }
  }

  throw new Error('No draft PDF available');
}

export async function openDraftPdf(leaseId: string, suggestedName?: string): Promise<void> {
  const url = await ensureDraftPdfUrl(leaseId);
  await downloadFileFromUrl(url, suggestedName || `lease_${leaseId}_draft.pdf`);
}

async function generateLocalDraftPdf(leasePack: any): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const draw = (text: string, size = 12, f = font) => {
    page.drawText(text, { x: 50, y, size, font: f });
    y -= size + 6;
  };

  draw('SwiftRent Residential Lease (Preview)', 18, bold);
  draw(`Lease ID: ${leasePack?.core?.leaseId || ''}`);
  draw(`Property: ${leasePack?.core?.propertyAddress || ''}`);
  draw(`Term: ${leasePack?.core?.startDate || ''} → ${leasePack?.core?.endDate || ''}`);
  draw(`Rent: R ${leasePack?.core?.monthlyRentZAR || 0}`);
  draw(' ');
  draw('This is a preview for review prior to signing.', 10);

  const bytes = await pdfDoc.save();
  const base64 = btoa(String.fromCharCode(...bytes));
  return `data:application/pdf;base64,${base64}`;
}



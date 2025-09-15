import { supabase } from '@/integrations/supabase/client';
import { downloadFileFromUrl } from '@/lib/download';

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
  }

  throw new Error('No draft PDF available');
}

export async function openDraftPdf(leaseId: string, suggestedName?: string): Promise<void> {
  const url = await ensureDraftPdfUrl(leaseId);
  await downloadFileFromUrl(url, suggestedName || `lease_${leaseId}_draft.pdf`);
}



// Securely accepts a bank-statement PDF for an affordability assessment.
// - Auth: caller must be the application's tenant.
// - Consent gate: a granted consent row must exist first.
// - Validates the REAL file type (PDF magic bytes), size and per-assessment count
//   against configurable limits, stores to the PRIVATE bucket via service role,
//   records a sha256 (for duplicate detection) and audits. No file bytes logged.
//
// Note: virus scanning is a pipeline step (status 'virus_scanning' in the
// processing job) — see the processing worker stage. Files land as 'uploaded'
// and are not processed until scanned.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const BUCKET = 'affordability-statements';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const applicationId = form.get('applicationId') as string | null;
    if (!file || !applicationId) throw new Error('file and applicationId are required');

    // Assessment + tenant + consent gate.
    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, status')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (!assessment) throw new Error('Consent required before uploading');
    if (assessment.tenant_id !== user.id) throw new Error('Forbidden');

    const { count: consentCount } = await supabase
      .from('affordability_consents')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessment.id)
      .eq('status', 'granted');
    if (!consentCount) throw new Error('Consent required before uploading');

    // Configurable limits.
    const { data: limitsRow } = await supabase
      .from('affordability_settings').select('value').eq('key', 'upload_limits').maybeSingle();
    const limits = (limitsRow?.value as any) || { max_file_bytes: 15_728_640, max_files: 6, allowed_mime: ['application/pdf'] };

    const bytes = new Uint8Array(await file.arrayBuffer());

    // Size + count limits.
    if (bytes.byteLength === 0) throw new Error('The file is empty');
    if (bytes.byteLength > limits.max_file_bytes) {
      return json({ error: `File is too large. Maximum ${Math.round(limits.max_file_bytes / 1048576)}MB.` }, 413);
    }
    const { count: docCount } = await supabase
      .from('affordability_documents')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessment.id)
      .neq('status', 'deleted');
    if ((docCount ?? 0) >= limits.max_files) {
      return json({ error: `You can upload at most ${limits.max_files} statements.` }, 400);
    }

    // Real file-type check: PDF magic bytes "%PDF-" (not just the extension/mime).
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    if (header !== '%PDF-') {
      return json({ error: 'Only PDF bank statements are supported. Please upload a valid PDF.' }, 400);
    }

    const sha = await sha256Hex(bytes);
    const { data: dup } = await supabase
      .from('affordability_documents')
      .select('id').eq('assessment_id', assessment.id).eq('sha256', sha).neq('status', 'deleted').maybeSingle();
    if (dup) return json({ error: 'This file has already been uploaded.' }, 409);

    const path = `${assessment.id}/${crypto.randomUUID()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error('Could not store the file');

    const { data: doc, error: docErr } = await supabase
      .from('affordability_documents')
      .insert({
        assessment_id: assessment.id,
        tenant_id: assessment.tenant_id,
        storage_path: path,
        original_filename: (file.name || 'statement.pdf').slice(0, 200),
        content_type: 'application/pdf',
        byte_size: bytes.byteLength,
        sha256: sha,
        status: 'uploaded',
      })
      .select('id, original_filename, byte_size, status, uploaded_at')
      .single();
    if (docErr) throw docErr;

    if (['consent_granted', 'waiting_for_tenant'].includes(assessment.status)) {
      await supabase.from('affordability_assessments')
        .update({ status: 'documents_uploaded' }).eq('id', assessment.id);
    }

    await supabase.rpc('affordability_audit', {
      p_assessment: assessment.id, p_event: 'document_uploaded', p_actor: user.id, p_role: 'tenant',
      p_detail: { document_id: doc.id, byte_size: bytes.byteLength },
    });

    return json({ document: doc });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-upload error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /Consent required/.test(msg) ? 403 : /required|too large|empty|PDF|already/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

// Document operations for an affordability assessment: issue a short-lived
// signed preview URL (audited), delete a document before submission, or submit
// the uploaded statements for analysis (creates a processing job).
//
// Access is isolated by role: tenants act on their own assessment; landlords on
// assessments for their properties (view only). All views/downloads are audited.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const BUCKET = 'affordability-statements';
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const { action, applicationId, documentId } = await req.json();
    if (!action || !applicationId) throw new Error('action and applicationId are required');

    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, landlord_id, status')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (!assessment) throw new Error('Assessment not found');

    const isTenant = assessment.tenant_id === user.id;
    const isLandlord = assessment.landlord_id === user.id;
    const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id });
    const isAdmin = adminRes === true;
    if (!isTenant && !isLandlord && !isAdmin) throw new Error('Forbidden');

    if (action === 'signed_url') {
      if (!documentId) throw new Error('documentId is required');
      const { data: doc } = await supabase
        .from('affordability_documents')
        .select('id, storage_path, status, assessment_id')
        .eq('id', documentId).eq('assessment_id', assessment.id).maybeSingle();
      if (!doc || doc.status === 'deleted') throw new Error('Document not found');
      const { data: signed, error } = await supabase.storage.from(BUCKET)
        .createSignedUrl(doc.storage_path, 120); // 2-minute link
      if (error || !signed) throw new Error('Could not create a preview link');
      await supabase.rpc('affordability_audit', {
        p_assessment: assessment.id, p_event: 'document_viewed', p_actor: user.id,
        p_role: isTenant ? 'tenant' : isLandlord ? 'landlord' : 'admin',
        p_detail: { document_id: doc.id },
      });
      return json({ url: signed.signedUrl, expiresInSeconds: 120 });
    }

    if (action === 'delete') {
      if (!isTenant) throw new Error('Forbidden');
      if (!documentId) throw new Error('documentId is required');
      // Only allow removing a file before analysis has started.
      if (!['consent_granted', 'documents_uploaded'].includes(assessment.status)) {
        throw new Error('Documents can only be removed before submitting for analysis');
      }
      const { data: doc } = await supabase
        .from('affordability_documents')
        .select('id, storage_path, status')
        .eq('id', documentId).eq('assessment_id', assessment.id).maybeSingle();
      if (!doc || doc.status === 'deleted') throw new Error('Document not found');
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      await supabase.from('affordability_documents')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', doc.id);
      await supabase.rpc('affordability_audit', {
        p_assessment: assessment.id, p_event: 'document_deleted', p_actor: user.id, p_role: 'tenant',
        p_detail: { document_id: doc.id },
      });
      return json({ ok: true });
    }

    if (action === 'submit') {
      if (!isTenant) throw new Error('Forbidden');
      const { count } = await supabase
        .from('affordability_documents')
        .select('id', { count: 'exact', head: true })
        .eq('assessment_id', assessment.id).neq('status', 'deleted');
      if (!count) throw new Error('Upload at least one statement before submitting');

      // Idempotent: reuse an active job if one already exists.
      const { data: activeJob } = await supabase
        .from('affordability_processing_jobs')
        .select('id, status')
        .eq('assessment_id', assessment.id)
        .not('status', 'in', '(completed,failed)')
        .maybeSingle();

      let jobId = activeJob?.id as string | undefined;
      if (!jobId) {
        const { data: job, error: jErr } = await supabase
          .from('affordability_processing_jobs')
          .insert({
            assessment_id: assessment.id,
            status: 'uploaded',
            idempotency_key: `${assessment.id}:${Date.now()}`,
          })
          .select('id').single();
        if (jErr) throw jErr;
        jobId = job.id;
      }
      await supabase.from('affordability_assessments')
        .update({ status: 'processing' }).eq('id', assessment.id);
      await supabase.rpc('affordability_audit', {
        p_assessment: assessment.id, p_event: 'submitted_for_analysis', p_actor: user.id, p_role: 'tenant',
        p_detail: { job_id: jobId, document_count: count },
      });
      // NOTE: the worker/processing edge function (next stage) picks up this job.
      return json({ jobId, status: 'processing' });
    }

    throw new Error('Unknown action');
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-documents error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required|before|at least|Unknown/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

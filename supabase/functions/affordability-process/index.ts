// Runs the affordability processing pipeline for an application's assessment.
// Triggered by the tenant after submitting (and can be re-triggered to retry).
// Claims the job idempotently, then runs the pipeline in the background so the
// HTTP response returns immediately; the client polls job status.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { runPipeline } from "../_shared/affordability/pipeline.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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

    const { applicationId } = await req.json();
    if (!applicationId) throw new Error('applicationId is required');

    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, landlord_id')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (!assessment) throw new Error('Assessment not found');

    const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id });
    const authorised = assessment.tenant_id === user.id || assessment.landlord_id === user.id || adminRes === true;
    if (!authorised) throw new Error('Forbidden');

    const { data: job } = await supabase
      .from('affordability_processing_jobs')
      .select('id, status, attempts, max_attempts')
      .eq('assessment_id', assessment.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!job) throw new Error('No processing job — submit documents first');

    // Only (re)start from a fresh or failed job, and respect max attempts.
    if (!['uploaded', 'failed'].includes(job.status)) {
      return json({ started: false, status: job.status });
    }
    if (job.attempts >= job.max_attempts) {
      await supabase.from('affordability_processing_jobs')
        .update({ status: 'failed', last_error: 'max_attempts_exceeded' }).eq('id', job.id);
      return json({ started: false, status: 'failed', reason: 'max_attempts_exceeded' });
    }

    // Claim the job atomically (guards against double-trigger races).
    const { data: claimed } = await supabase
      .from('affordability_processing_jobs')
      .update({ status: 'validating', attempts: job.attempts + 1, started_at: new Date().toISOString(), last_error: null })
      .eq('id', job.id)
      .in('status', ['uploaded', 'failed'])
      .select('id')
      .maybeSingle();
    if (!claimed) return json({ started: false, status: 'already_running' });

    await supabase.from('affordability_assessments').update({ status: 'processing' }).eq('id', assessment.id);

    const work = runPipeline(supabase, assessment.id, job.id);
    // Run in the background where supported so the request returns immediately.
    // deno-lint-ignore no-explicit-any
    const edge = (globalThis as any).EdgeRuntime;
    if (edge?.waitUntil) {
      edge.waitUntil(work);
      return json({ started: true, jobId: job.id });
    }
    await work;
    return json({ started: true, jobId: job.id, sync: true });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-process error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required|submit/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

// Retention purge: deletes statement files + raw transaction data for
// assessments past their expiry, per the configurable retention policy.
// Protected by a shared secret (AFFORDABILITY_CRON_SECRET) so only the
// scheduler can invoke it. Intended to be called on a schedule (e.g. daily).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const BUCKET = 'affordability-statements';

serve(async (req: Request) => {
  try {
    const secret = req.headers.get('x-cron-secret');
    if (!secret || secret !== Deno.env.get('AFFORDABILITY_CRON_SECRET')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: due } = await supabase
      .from('affordability_assessments')
      .select('id')
      .lt('expires_at', new Date().toISOString())
      .is('deleted_at', null)
      .neq('status', 'deleted')
      .limit(100);

    let purged = 0;
    for (const a of due ?? []) {
      const { data: docs } = await supabase
        .from('affordability_documents').select('id, storage_path').eq('assessment_id', a.id).neq('status', 'deleted');
      const paths = (docs ?? []).map((d: any) => d.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);

      await supabase.from('affordability_documents')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('assessment_id', a.id);
      // Raw transaction text is the most sensitive derived data — remove it.
      await supabase.from('affordability_transactions').delete().eq('assessment_id', a.id);
      await supabase.from('affordability_assessments')
        .update({ status: 'expired', deleted_at: new Date().toISOString() }).eq('id', a.id);
      await supabase.rpc('affordability_audit', { p_assessment: a.id, p_event: 'retention_purged', p_role: 'system' });
      purged += 1;
    }

    return new Response(JSON.stringify({ purged }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('affordability-retention error:', (e as Error)?.message);
    return new Response(JSON.stringify({ error: 'Retention purge failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

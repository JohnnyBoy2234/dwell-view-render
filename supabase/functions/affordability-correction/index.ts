// Tenant (or landlord) raises a correction request, or the tenant requests a
// human review, on an affordability assessment. Notifies the other party.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

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
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) throw new Error('Unauthorized');

    const { applicationId, action = 'correction', message, targetTransactionId } = await req.json();
    if (!applicationId) throw new Error('applicationId is required');
    if (!message?.trim() && action === 'correction') throw new Error('A message describing the correction is required');

    const { data: assessment } = await supabase
      .from('affordability_assessments')
      .select('id, tenant_id, landlord_id')
      .eq('application_id', applicationId).maybeSingle();
    if (!assessment) throw new Error('Assessment not found');

    const isTenant = assessment.tenant_id === user.id;
    const isLandlord = assessment.landlord_id === user.id;
    const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id });
    if (!isTenant && !isLandlord && adminRes !== true) throw new Error('Forbidden');
    const role = isTenant ? 'tenant' : isLandlord ? 'landlord' : 'admin';

    await supabase.from('affordability_correction_requests').insert({
      assessment_id: assessment.id,
      requested_by: user.id,
      requester_role: isTenant ? 'tenant' : 'landlord',
      message: (message?.trim()) || (action === 'human_review' ? 'Human review requested' : 'Correction requested'),
      target_transaction_id: targetTransactionId ?? null,
      status: 'open',
    });

    // A tenant asking for human review flags the assessment for manual review.
    if (action === 'human_review' && isTenant) {
      await supabase.from('affordability_assessments').update({ status: 'manual_review_required' }).eq('id', assessment.id);
    } else if (action === 'correction') {
      await supabase.from('affordability_assessments').update({ status: 'correction_requested' }).eq('id', assessment.id);
    }

    // Notify the other party.
    const notifyUser = isTenant ? assessment.landlord_id : assessment.tenant_id;
    const notifyMsg = isTenant
      ? (action === 'human_review'
          ? 'A tenant has requested a human review of their affordability assessment.'
          : 'A tenant has requested a correction to their affordability assessment.')
      : 'Your landlord has requested a correction to your affordability assessment.';
    await supabase.rpc('create_notification', {
      _user_id: notifyUser, _message: notifyMsg,
      _link_url: isTenant ? '/landlord/dashboard' : '/enhancedtenantdashboard',
      _type: 'application', _metadata: { application_id: applicationId },
    });

    await supabase.rpc('affordability_audit', {
      p_assessment: assessment.id, p_event: action === 'human_review' ? 'human_review_requested' : 'correction_requested',
      p_actor: user.id, p_role: role,
    });

    return json({ ok: true });
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    console.error('affordability-correction error:', msg);
    const status = /Unauthorized/.test(msg) ? 401 : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : /required/.test(msg) ? 400 : 500;
    return json({ error: msg }, status);
  }
});

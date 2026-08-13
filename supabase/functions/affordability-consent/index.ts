// Records a tenant's POPIA consent for the affordability assessment of a rental
// application. Consent MUST exist before any document processing happens.
//
// Security: authenticates the caller via their JWT, confirms they are the tenant
// on the application, then writes with the service role. Never logs statement or
// financial data.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const isInet = (v: string | null): string | null =>
  v && /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/.test(v) ? v : null;

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

    // Confirm the caller is the tenant on this application.
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, tenant_id, landlord_id, property_id')
      .eq('id', applicationId)
      .maybeSingle();
    if (appErr || !app) throw new Error('Application not found');
    if (app.tenant_id !== user.id) throw new Error('Forbidden');

    // Proposed rent = the property's advertised rent.
    let proposedRent: number | null = null;
    if (app.property_id) {
      const { data: prop } = await supabase
        .from('properties').select('price').eq('id', app.property_id).maybeSingle();
      proposedRent = prop?.price ?? null;
    }

    // Active consent version + wording from configuration.
    const { data: settings } = await supabase
      .from('affordability_settings').select('key, value');
    const map = new Map((settings ?? []).map((r: any) => [r.key, r.value]));
    const version = (map.get('active_consent_version') as string) || 'v1';
    const consentText = (map.get(`consent_text_${version}`) as string) || '';

    // Ensure one assessment per application.
    const { data: existing } = await supabase
      .from('affordability_assessments')
      .select('id, status').eq('application_id', applicationId).maybeSingle();

    let assessmentId = existing?.id as string | undefined;
    if (!assessmentId) {
      const { data: created, error: cErr } = await supabase
        .from('affordability_assessments')
        .insert({
          application_id: applicationId,
          tenant_id: app.tenant_id,
          landlord_id: app.landlord_id,
          property_id: app.property_id,
          proposed_rent: proposedRent,
          status: 'consent_granted',
          provider_status: 'self_hosted',
        })
        .select('id').single();
      if (cErr) throw cErr;
      assessmentId = created.id;
    } else if (['not_requested', 'waiting_for_tenant'].includes(existing!.status)) {
      // Advance to consent_granted without ever regressing a later state.
      await supabase.from('affordability_assessments')
        .update({ status: 'consent_granted' }).eq('id', assessmentId);
    }

    const ip = isInet((req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null);
    const ua = req.headers.get('user-agent');

    const { error: consentErr } = await supabase.from('affordability_consents').insert({
      assessment_id: assessmentId,
      tenant_id: app.tenant_id,
      application_id: applicationId,
      property_id: app.property_id,
      landlord_id: app.landlord_id,
      consent_version: version,
      consent_text: consentText,
      status: 'granted',
      ip_address: ip,
      user_agent: ua,
    });
    if (consentErr) throw consentErr;

    await supabase.rpc('affordability_audit', {
      p_assessment: assessmentId,
      p_event: 'consent_granted',
      p_actor: user.id,
      p_role: 'tenant',
      p_detail: { consent_version: version },
      p_ip: ip,
      p_ua: ua,
    });

    return new Response(
      JSON.stringify({ assessmentId, status: 'consent_granted', consentVersion: version }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const msg = (e as Error)?.message || 'Unexpected error';
    // Minimal, non-sensitive error logging only.
    console.error('affordability-consent error:', msg);
    const status = /Unauthorized/.test(msg) ? 401
      : /Forbidden/.test(msg) ? 403
      : /not found/i.test(msg) ? 404 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

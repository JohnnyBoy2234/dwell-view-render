import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, tenantEmail, tenantId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const resend = new Resend(resendApiKey);

    // Fetch contract data
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // ── >10-year e-signature guardrail (ECTA / Alienation of Land Act) ─────────
    // Fixed-term residential leases longer than 10 years may not be validly
    // concluded by standard electronic signature — they must be signed in wet
    // ink (and, over 10 years, are registrable against the title deed). Block
    // the e-sign send and tell the landlord to sign on paper instead.
    const cd = contract.contract_data || {};
    if (cd.leaseType === 'fixed' && cd.leaseStartDate && cd.leaseEndDate) {
      const years = (new Date(cd.leaseEndDate).getTime() - new Date(cd.leaseStartDate).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (years > 10) {
        return new Response(
          JSON.stringify({
            error: 'LEASE_TERM_TOO_LONG',
            message: 'Leases longer than 10 years cannot be signed electronically in South Africa. Please download the lease, sign it in wet ink with the tenant, and keep the signed original. A lease over 10 years should also be registered against the property title.',
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Get landlord profile for sender info
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', contract.landlord_id)
      .single();

    // Resolve the tenant. Leases are only ever created against an existing
    // tenant account (an active tenancy or an accepted application), so the
    // real linked account — the caller-provided tenantId, or the tenant_id
    // already on the contract — is always the source of truth.
    const tenantUserId: string | null = tenantId || contract.tenant_id || null;

    if (!tenantUserId) {
      throw new Error("No tenant linked to this contract.");
    }

    // Always email the tenant's real address (the typed email may be wrong or a relay).
    let resolvedEmail: string | null = tenantEmail || null;
    try {
      const { data: tenantAuth } = await supabase.auth.admin.getUserById(tenantUserId);
      if (tenantAuth?.user?.email) resolvedEmail = tenantAuth.user.email;
    } catch (_) { /* best effort */ }

    // Update contract with tenant information
    const { error: updateError } = await supabase
      .from('lease_contracts')
      .update({
        tenant_id: tenantUserId,
        status: 'pending_tenant',
        contract_data: {
          ...contract.contract_data,
          tenantEmail: resolvedEmail || tenantEmail || null,
        },
      })
      .eq('id', contractId);

    if (updateError) throw updateError;

    // Let the tenant know inside the app too - email alone is easy to miss.
    await supabase.from('notifications').insert({
      user_id: tenantUserId,
      message: `A lease has been prepared for ${contract.contract_data?.propertyAddress || 'your property'}. Please review and sign.`,
      type: 'lease',
      link_url: `/lease/sign/${contractId}`,
    });

    // Add audit entry
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'sent_to_tenant',
      actor_id: contract.landlord_id,
      details: { tenant_email: resolvedEmail },
    });

    // Send email notification (best effort)
    const landlordName = landlordProfile?.display_name || 'Your Landlord';
    const propertyAddress = contract.contract_data?.propertyAddress || 'the property';
    const signUrl = `${Deno.env.get('APP_BASE_URL')}/lease/sign/${contractId}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">
          Lease Agreement Ready for Signature
        </h2>
        <p>Hello,</p>
        <p>${landlordName} has prepared a lease agreement for <strong>${propertyAddress}</strong> and is ready for your review and signature.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Contract Details:</h3>
          <ul style="margin: 10px 0;">
            <li><strong>Property:</strong> ${propertyAddress}</li>
            <li><strong>Monthly Rent:</strong> ${contract.contract_data?.rentCurrency || 'ZAR'} ${contract.contract_data?.rentAmount?.toLocaleString() || 'TBD'}</li>
            <li><strong>Lease Start:</strong> ${contract.contract_data?.leaseStartDate || 'TBD'}</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signUrl}"
             style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review &amp; Sign Lease Agreement
          </a>
        </div>
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; color: #64748b; font-size: 14px;">
          <p>This electronic signature process is legally binding and ESIGN/UETA compliant. If you have any questions, please contact ${landlordName} directly.</p>
        </div>
      </div>
    `;

    if (resolvedEmail) {
      const { error: emailError } = await resend.emails.send({
        from: `MzanziHomes <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co"}>`,
        to: [resolvedEmail],
        subject: `Lease Agreement Ready - ${propertyAddress}`,
        html: emailHtml,
      });
      if (emailError) {
        console.error("Email error:", emailError);
        // Don't fail the whole operation if email fails — the in-app notification stands.
      }
    }

    return new Response(JSON.stringify({
      success: true,
      contractId,
      tenantUserId,
      signUrl,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error sending contract:", error);
    return new Response(JSON.stringify({
      error: (error as Error).message || "Failed to send contract to tenant",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

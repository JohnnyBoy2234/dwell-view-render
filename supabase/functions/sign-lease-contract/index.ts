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
    const { contractId, signatureData } = await req.json();
    
    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid authentication");

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // Determine signer role
    const isLandlord = contract.landlord_id === user.id;
    const isTenant = contract.tenant_id === user.id;
    
    if (!isLandlord && !isTenant) {
      throw new Error("User not authorized to sign this contract");
    }

    // Check if already signed
    if (isLandlord && contract.landlord_signed_at) {
      throw new Error("Landlord has already signed this contract");
    }
    if (isTenant && contract.tenant_signed_at) {
      throw new Error("Tenant has already signed this contract");
    }

    // Signing order: the tenant reviews and signs first, the landlord countersigns.
    if (isLandlord && !contract.tenant_signed_at) {
      throw new Error("The tenant must sign first. You'll be able to countersign once they have signed.");
    }

    // Generate document hash for audit
    const documentContent = JSON.stringify(contract.contract_data);
    const encoder = new TextEncoder();
    const data = encoder.encode(documentContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Use the signature hash provided by the client (already calculated there)
    const sigHashHex = signatureData.signature_hash;

    const now = new Date().toISOString();
    const signerRole = isLandlord ? 'landlord' : 'tenant';

    // Update contract with signature
    const updateData: any = {
      updated_at: now
    };

    if (isLandlord) {
      updateData.landlord_signed_at = now;
      updateData.landlord_signature_data = signatureData;
      updateData.status = contract.tenant_signed_at ? 'signed' : 'pending_tenant';
    } else {
      updateData.tenant_signed_at = now;  
      updateData.tenant_signature_data = signatureData;
      updateData.status = contract.landlord_signed_at ? 'signed' : 'pending_landlord';
    }

    const { error: updateError } = await supabase
      .from('lease_contracts')
      .update(updateData)
      .eq('id', contractId);

    if (updateError) throw updateError;

    // Create signature audit record
    const { error: auditError } = await supabase
      .from('signature_audit')
      .insert({
        lease_contract_id: contractId,
        signer_id: user.id,
        signer_role: signerRole,
        signature_hash: sigHashHex,
        ip_address: signatureData.ip_address,
        user_agent: signatureData.user_agent,
        document_hash: documentHash,
        consent_method: 'click_to_sign',
        geolocation: signatureData.geolocation,
        verification_data: {
          consent_acknowledged: signatureData.consent_acknowledged,
          timestamp: now
        }
      });

    if (auditError) throw auditError;

    // Add audit trail entry
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'contract_signed',
      actor_id: user.id,
      details: { 
        signer_role: signerRole,
        signature_hash: sigHashHex,
        document_hash: documentHash
      }
    });

    // Once both parties have signed, create the tenancy — regardless of who
    // signed last (tenant-first or landlord-first). Idempotent + service role.
    if (updateData.status === 'signed') {
      try {
        if (contract.property_id && contract.tenant_id) {
          const { data: existingTenancy } = await supabase
            .from('tenancies')
            .select('id')
            .eq('property_id', contract.property_id)
            .eq('tenant_id', contract.tenant_id)
            .eq('status', 'active')
            .maybeSingle();
          if (!existingTenancy) {
            const cd = contract.contract_data || {};
            const start = cd.leaseStartDate || now.slice(0, 10);
            const end = cd.leaseEndDate ||
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            await supabase.from('tenancies').insert({
              property_id: contract.property_id,
              tenant_id: contract.tenant_id,
              landlord_id: contract.landlord_id,
              start_date: start,
              end_date: end,
              monthly_rent: Number(cd.rentAmount) || 0,
              security_deposit: Number(cd.depositAmount) || 0,
              status: 'active',
            });
          }
        }
      } catch (e) {
        console.error('Tenancy creation on full-sign failed:', e);
      }
      await sendCompletionNotifications(supabase, contract, contractId);
    }

    return new Response(JSON.stringify({ 
      success: true,
      contractId,
      status: updateData.status,
      signatureHash: sigHashHex
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error signing contract:", error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || "Failed to sign contract" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function sendCompletionNotifications(supabase: any, contract: any, contractId: string) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);

    // Get both parties' profiles
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', contract.landlord_id)
      .single();

    const { data: tenantProfile } = await supabase
      .from('profiles')  
      .select('display_name')
      .eq('user_id', contract.tenant_id)
      .single();

    const landlordName = landlordProfile?.display_name || 'Landlord';
    const tenantName = tenantProfile?.display_name || 'Tenant';
    const propertyAddress = contract.contract_data?.propertyAddress || 'the property';

    // Email template for completion
    const completionEmailHtml = (recipient: string, otherParty: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
          🎉 Lease Agreement Fully Executed
        </h2>
        
        <p>Congratulations!</p>
        
        <p>The lease agreement for <strong>${propertyAddress}</strong> has been successfully signed by both parties.</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3 style="margin-top: 0; color: #16a34a;">Contract Status: Fully Executed</h3>
          <ul style="margin: 10px 0;">
            <li><strong>Property:</strong> ${propertyAddress}</li>
            <li><strong>Landlord:</strong> ${landlordName}</li>
            <li><strong>Tenant:</strong> ${tenantName}</li>
            <li><strong>Completed:</strong> ${new Date().toLocaleDateString()}</li>
          </ul>
        </div>
        
        <p><strong>What happens next:</strong></p>
        <ul>
          <li>Both parties will receive a final copy of the signed agreement</li>
          <li>The lease terms are now legally binding</li>
          <li>You can access the agreement anytime from your dashboard</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${Deno.env.get('APP_BASE_URL')}/leases" 
             style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            View Agreement
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; color: #64748b; font-size: 14px;">
          <p>This is a legally binding agreement. Please keep this confirmation for your records.</p>
        </div>
      </div>
    `;

    // Send to both parties
    const landlordEmail = contract.contract_data?.landlordEmail;
    const tenantEmail = contract.contract_data?.tenantEmail;

    if (landlordEmail) {
      await resend.emails.send({
        from: `MzanziHomes <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co"}>`,
        to: [landlordEmail],
        subject: `✅ Lease Agreement Completed - ${propertyAddress}`,
        html: completionEmailHtml(landlordName, tenantName),
      });
    }

    if (tenantEmail) {
      await resend.emails.send({
        from: `MzanziHomes <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co"}>`,
        to: [tenantEmail],
        subject: `✅ Lease Agreement Completed - ${propertyAddress}`,
        html: completionEmailHtml(tenantName, landlordName),
      });
    }

  } catch (error) {
    console.error("Error sending completion notifications:", error);
    // Don't fail the signing process if notification fails
  }
}
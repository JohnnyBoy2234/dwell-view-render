import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Generate document hash for audit
    const documentContent = JSON.stringify(contract.contract_data);
    const encoder = new TextEncoder();
    const data = encoder.encode(documentContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Generate signature hash
    const signatureHash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(signatureData.signature_image_url + Date.now())
    );
    const sigHashArray = Array.from(new Uint8Array(signatureHash));
    const sigHashHex = sigHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

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

    // Send notifications if contract is fully signed
    if (updateData.status === 'signed') {
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
      error: error.message || "Failed to sign contract" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function sendCompletionNotifications(supabase: any, contract: any, contractId: string) {
  try {
    console.log('Would send completion notifications for contract:', contractId);
    
    // TODO: Re-enable email notifications after fixing Resend import
    /*
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) return;

    const resend = new Resend(resendApiKey);
    ... email sending code ...
    */
  } catch (error) {
    console.error("Error sending completion notifications:", error);
    // Don't fail the signing process if notification fails
  }
}
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
    const { contractId, tenantEmail } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract data
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // Get landlord profile for sender info
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', contract.landlord_id)
      .single();

    // Find or create tenant user by email
    let tenantUserId = null;
    const { data: existingUser, error: userError } = await supabase.auth.admin.getUserByEmail(tenantEmail);
    
    if (userError && userError.message !== 'User not found') {
      throw userError;
    }

    if (existingUser?.user) {
      tenantUserId = existingUser.user.id;
    } else {
      // Create a new user account for the tenant
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: tenantEmail,
        email_confirm: true,
        user_metadata: {
          invited_for_lease: contractId,
          role: 'tenant'
        }
      });

      if (createError) throw createError;
      tenantUserId = newUser.user?.id;
    }

    // Update contract with tenant information
    const { error: updateError } = await supabase
      .from('lease_contracts')
      .update({
        tenant_id: tenantUserId,
        status: 'pending_tenant',
        contract_data: {
          ...contract.contract_data,
          tenantEmail: tenantEmail
        }
      })
      .eq('id', contractId);

    if (updateError) throw updateError;

    // Add audit entry
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'sent_to_tenant',
      actor_id: contract.landlord_id,
      details: { tenant_email: tenantEmail }
    });

    // Temporarily disable email sending
    console.log('Would send contract to tenant:', tenantEmail);
    console.log('Sign URL would be:', signUrl);

    // TODO: Re-enable email sending after fixing Resend import
    /*
    const { error: emailError } = await resend.emails.send({
      from: `SwiftRent <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@swiftrent.co"}>`,
      to: [tenantEmail],
      subject: `Lease Agreement Ready - ${propertyAddress}`,
      html: emailHtml,
    });
    */

    return new Response(JSON.stringify({ 
      success: true, 
      contractId,
      tenantUserId,
      signUrl 
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error sending contract:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to send contract to tenant" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
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
    const { contractId, tenantEmail } = await req.json();
    
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

    // Get landlord profile for sender info
    const { data: landlordProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', contract.landlord_id)
      .single();

    // Find existing tenant user by email using listUsers
    let tenantUserId = null;
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();
    
    if (!listUsersError && users) {
      const existingUser = users.find(u => u.email === tenantEmail);
      if (existingUser) {
        tenantUserId = existingUser.id;
      }
    }

    if (!tenantUserId) {
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

    // Send email notification
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
        
        <p><strong>Next Steps:</strong></p>
        <ol>
          <li>Click the link below to review the full lease agreement</li>
          <li>Read through all terms and conditions carefully</li>
          <li>Complete the electronic signature process</li>
        </ol>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${signUrl}" 
             style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review & Sign Lease Agreement
          </a>
        </div>
        
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; color: #64748b; font-size: 14px;">
          <p>This email was sent because ${landlordName} has invited you to sign a lease agreement. The electronic signature process is legally binding and ESIGN/UETA compliant.</p>
          <p>If you have any questions about this lease agreement, please contact ${landlordName} directly.</p>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: `MzanziHomes <${Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co"}>`,
      to: [tenantEmail],
      subject: `Lease Agreement Ready - ${propertyAddress}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Email error:", emailError);
      // Don't fail the whole operation if email fails
    }

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
      error: (error as Error).message || "Failed to send contract to tenant" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
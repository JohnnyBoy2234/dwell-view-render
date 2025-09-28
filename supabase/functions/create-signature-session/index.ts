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
    const { contractId, signerRole } = await req.json();
    
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

    // Fetch contract to validate access
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) throw contractError;

    // Validate user can sign this role
    if (signerRole === 'landlord' && contract.landlord_id !== user.id) {
      throw new Error("User not authorized as landlord for this contract");
    }
    if (signerRole === 'tenant' && contract.tenant_id !== user.id) {
      throw new Error("User not authorized as tenant for this contract");
    }

    // Check if already signed
    if (signerRole === 'landlord' && contract.landlord_signed_at) {
      throw new Error("Landlord has already signed this contract");
    }
    if (signerRole === 'tenant' && contract.tenant_signed_at) {
      throw new Error("Tenant has already signed this contract");
    }

    // Create session (simplified - in production you might want to store session data)
    const session = {
      id: crypto.randomUUID(),
      contractId,
      signerRole,
      userId: user.id,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    // Add audit entry for session creation
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'signature_session_created',
      actor_id: user.id,
      details: { 
        signer_role: signerRole,
        session_id: session.id
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      session
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error creating signature session:", error);
    return new Response(JSON.stringify({ 
      error: (error as Error).message || "Failed to create signature session" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
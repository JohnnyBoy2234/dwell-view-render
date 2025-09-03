// @ts-nocheck
// DocuSign: generate embedded recipient view (signing URL) for tenant or landlord using OAuth2
// Request body: { tenancyId: string, role: 'tenant'|'landlord', accessToken: string, returnUrl?: string }
// Secrets required:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_CLIENT_SECRET, DOCUSIGN_AUTH_SERVER, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_BASE_PATH

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }
  
  try {
    console.log("=== DocuSign Recipient View Function Started (OAuth2) ===");
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    const { tenancyId, role, accessToken, returnUrl = "https://swiftrent.co.za/tenant-dashboard" } = body;
    
    if (!tenancyId || !role || !accessToken || (role !== "tenant" && role !== "landlord")) {
      return new Response(JSON.stringify({ error: "tenancyId, role ('tenant'|'landlord'), and accessToken are required" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("Supabase config check - URL exists:", !!SUPABASE_URL, "SERVICE_ROLE exists:", !!SERVICE_ROLE);
    
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    console.log("Supabase client created successfully");

    // Fetch tenancy data
    console.log(`Fetching tenancy data for ID: ${tenancyId}`);
    const { data: tenancy, error: tenancyError } = await supabase
      .from("tenancies")
      .select(`
        id,
        property_id,
        tenant_id,
        landlord_id,
        envelope_id,
        signing_provider,
        properties:property_id (
          id,
          title,
          address
        ),
        tenant:tenant_id (
          id,
          full_name,
          email
        ),
        landlord:landlord_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", tenancyId)
      .single();

    console.log("Tenancy query result:", { tenancy: !!tenancy, error: tenancyError });
    
    if (tenancyError || !tenancy) {
      console.error("Failed to fetch tenancy:", tenancyError);
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Determine recipient details based on role
    let recipientEmail, recipientName, clientUserId;
    if (role === "tenant") {
      recipientEmail = tenancy.tenant?.email;
      recipientName = tenancy.tenant?.full_name;
      clientUserId = tenancy.tenant_id;
    } else {
      recipientEmail = tenancy.landlord?.email;
      recipientName = tenancy.landlord?.full_name;
      clientUserId = tenancy.landlord_id;
    }

    if (!recipientEmail || !recipientName) {
      return new Response(JSON.stringify({ error: `Missing ${role} email or name` }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Check if envelope exists, if not create one
    let envelopeId = tenancy.envelope_id;
    if (!envelopeId) {
      console.log("No envelope_id found, creating new envelope...");
      const createResult = await createEnvelope(accessToken, tenancy);
      if (!createResult.success) {
        return new Response(JSON.stringify({ error: createResult.error }), { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
      envelopeId = createResult.envelopeId;
      
      // Update tenancy with envelope_id
      const { error: updateError } = await supabase
        .from("tenancies")
        .update({ 
          envelope_id: envelopeId,
          signing_provider: "docusign"
        })
        .eq("id", tenancyId);
      
      if (updateError) {
        console.error("Failed to update tenancy with envelope_id:", updateError);
      }
    }

    // Generate recipient view URL
    const recipientViewUrl = await generateRecipientView(
      accessToken,
      envelopeId,
      recipientEmail,
      recipientName,
      clientUserId,
      returnUrl
    );

    if (!recipientViewUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate recipient view" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    return new Response(JSON.stringify({ 
      signingUrl: recipientViewUrl,
      envelopeId: envelopeId 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});

async function createEnvelope(accessToken: string, tenancy: any) {
  try {
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    
    if (!accountId) {
      throw new Error("Missing DOCUSIGN_ACCOUNT_ID");
    }

    // Call the create-docusign-envelope-oauth function with OAuth2 token
    const createResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-docusign-envelope-oauth`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenancyId: tenancy.id,
        accessToken: accessToken,
        accountId: accountId,
        basePath: basePath
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`create-docusign-envelope failed ${createResponse.status}: ${errorText}`);
    }

    const result = await createResponse.json();
    return { success: true, envelopeId: result.envelopeId };
  } catch (error) {
    console.error("Error creating envelope:", error);
    return { success: false, error: error.message };
  }
}

async function generateRecipientView(
  accessToken: string,
  envelopeId: string,
  recipientEmail: string,
  recipientName: string,
  clientUserId: string,
  returnUrl: string
) {
  try {
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    
    if (!accountId) {
      throw new Error("Missing DOCUSIGN_ACCOUNT_ID");
    }

    const recipientViewRequest = {
      authenticationMethod: "none",
      email: recipientEmail,
      userName: recipientName,
      clientUserId: clientUserId,
      returnUrl: returnUrl
    };

    const response = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recipientViewRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Recipient view failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.url;
  } catch (error) {
    console.error("Error generating recipient view:", error);
    return null;
  }
}

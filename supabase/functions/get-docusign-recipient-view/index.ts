// @ts-nocheck
// DocuSign: generate embedded recipient view (signing URL) for tenant or landlord
// Request body: { tenancyId: string, role: 'tenant'|'landlord', returnUrl?: string }
// Secrets required:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_IMPERSONATED_USER_ID, DOCUSIGN_AUTH_SERVER, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_BASE_PATH, DOCUSIGN_RSA_PRIVATE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.2.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getAccessTokenJWT() {
  const integrationKey = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
  const impersonatedUserId = Deno.env.get("DOCUSIGN_IMPERSONATED_USER_ID");
  const authServer = Deno.env.get("DOCUSIGN_AUTH_SERVER") || "account-d.docusign.com";
  const rsaPrivateKeyPem = Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY");
  
  if (!integrationKey || !impersonatedUserId || !rsaPrivateKeyPem) {
    throw new Error("Missing DocuSign JWT secrets");
  }
  
  const alg = "RS256";
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 9 * 60; // 9 minutes
  const privateKey = await importPKCS8(rsaPrivateKeyPem, alg);
  
  const jwt = await new SignJWT({ scope: "signature impersonation" })
    .setProtectedHeader({ alg })
    .setIssuedAt(now)
    .setIssuer(integrationKey)
    .setSubject(impersonatedUserId)
    .setAudience(`https://${authServer}/oauth/token`)
    .setExpirationTime(exp)
    .sign(privateKey);

  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", jwt);

  const res = await fetch(`https://${authServer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DocuSign token error: ${res.status} ${errText}`);
  }
  
  const json = await res.json();
  return json.access_token as string;
}

function b64encode(uint8: Uint8Array) {
  return btoa(String.fromCharCode(...uint8));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders } });
  }
  
  try {
    console.log("=== DocuSign Recipient View Function Started ===");
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    const { tenancyId, role, returnUrl = "https://swiftrent.co.za/tenant-dashboard" } = body;
    
    if (!tenancyId || !role || (role !== "tenant" && role !== "landlord")) {
      return new Response(JSON.stringify({ error: "tenancyId and role ('tenant'|'landlord') are required" }), { 
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

    // Load tenancy with lease document path
    const { data: tenancy, error: tErr } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, lease_document_path")
      .eq("id", tenancyId)
      .maybeSingle();
      
    if (tErr || !tenancy) {
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Create envelope for this signing session
    const createEnvelopeResp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/create-docusign-envelope`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tenancyId })
    });
    
    if (!createEnvelopeResp.ok) {
      const errText = await createEnvelopeResp.text();
      return new Response(JSON.stringify({ error: `Failed to create envelope: ${errText}` }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }
    
    const { envelopeId } = await createEnvelopeResp.json();
    if (!envelopeId) {
      return new Response(JSON.stringify({ error: "No envelope ID received from create-docusign-envelope" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Load profiles and emails
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", [tenancy.tenant_id, tenancy.landlord_id]);
      
    if (pErr) {
      return new Response(JSON.stringify({ error: "Failed to load profiles" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }
    
    const nameById: Record<string, string> = {};
    for (const p of profiles || []) {
      nameById[p.user_id] = p.display_name;
    }

    // Get user emails
    const tenantUser = await supabase.auth.admin.getUserById(tenancy.tenant_id);
    const landlordUser = await supabase.auth.admin.getUserById(tenancy.landlord_id);
    const tenantEmail = tenantUser.data?.user?.email;
    const landlordEmail = landlordUser.data?.user?.email;
    
    if (!tenantEmail || !landlordEmail) {
      return new Response(JSON.stringify({ error: "Missing tenant or landlord email" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Get DocuSign access token
    const accessToken = await getAccessTokenJWT();
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Server misconfigured: DOCUSIGN_ACCOUNT_ID" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Determine signer attributes based on role
    const userEmail = role === "tenant" ? tenantEmail : landlordEmail;
    const userId = role === "tenant" ? tenancy.tenant_id : tenancy.landlord_id;
    const userName = nameById[userId] || (role === "tenant" ? "Tenant" : "Landlord");
    const clientUserId = userId; // required for embedded signing

    const viewReq = {
      returnUrl,
      authenticationMethod: "None",
      email: userEmail,
      userName,
      clientUserId,
    };

    // Create recipient view for embedded signing
    const viewResp = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${accessToken}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(viewReq),
    });
    
    if (!viewResp.ok) {
      const errText = await viewResp.text();
      console.error(`DocuSign recipient view failed: ${viewResp.status} ${errText}`);
      return new Response(JSON.stringify({ 
        error: `DocuSign recipient view failed: ${viewResp.status} ${errText}` 
      }), { 
        status: 502, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }
    
    const viewJson = await viewResp.json();
    const url = viewJson.url as string;

    return new Response(JSON.stringify({ url }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
    
  } catch (e) {
    console.error("Edge function error:", e);
    console.error("Error stack:", e.stack);
    return new Response(JSON.stringify({ 
      error: String(e),
      stack: e.stack,
      message: e.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});
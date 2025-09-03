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

async function getAccessTokenJWT() {
  const integrationKey = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
  const impersonatedUserId = Deno.env.get("DOCUSIGN_IMPERSONATED_USER_ID");
  const authServer = Deno.env.get("DOCUSIGN_AUTH_SERVER") || "account-d.docusign.com";
  const rsaPrivateKeyRaw = Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY") || "";
  const rsaPrivateKeyPem = rsaPrivateKeyRaw.includes("\\n") ? rsaPrivateKeyRaw.replace(/\\n/g, "\n") : rsaPrivateKeyRaw;
  if (rsaPrivateKeyPem.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("DOCUSIGN_RSA_PRIVATE_KEY must be PKCS8 (BEGIN PRIVATE KEY), not PKCS1 (BEGIN RSA PRIVATE KEY). Convert your key to PKCS8 and update the secret.");
  }
  
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
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
    console.log("Supabase client created successfully");

    // Load tenancy with lease document path and existing envelope if any
    console.log("Fetching tenancy data for ID:", tenancyId);
    const { data: tenancy, error: tErr } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, lease_document_path, envelope_id, signing_provider, lease_status")
      .eq("id", tenancyId)
      .maybeSingle();
    
    console.log("Tenancy query result:", { tenancy: !!tenancy, error: tErr });
      
    if (tErr || !tenancy) {
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Helper to create envelope
    async function createEnvelope(): Promise<string> {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-docusign-envelope`;
      console.log("Calling create-docusign-envelope:", url);
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_ROLE}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tenancyId })
      });
      const text = await resp.text();
      console.log("create-docusign-envelope status:", resp.status, "body:", text);
      if (!resp.ok) {
        throw new Error(`create-docusign-envelope failed ${resp.status}: ${text}`);
      }
      try {
        const json = JSON.parse(text || "{}");
        return json.envelopeId as string;
      } catch (e) {
        throw new Error(`create-docusign-envelope invalid JSON: ${text}`);
      }
    }

    // Use existing envelope if available; otherwise create (with one retry). Guard that a lease PDF exists before creating.
    let envelopeId: string | undefined = (tenancy as any).envelope_id && (tenancy as any).signing_provider === 'docusign' 
      ? (tenancy as any).envelope_id 
      : undefined;
    if (!envelopeId) {
      if (!(tenancy as any).lease_document_path) {
        return new Response(JSON.stringify({ error: "Lease document not found for this tenancy. Generate the lease first from the landlord dashboard." }), { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        });
      }
      try {
        envelopeId = await createEnvelope();
      } catch (e) {
        console.warn("First attempt to create envelope failed, retrying once...", e);
        envelopeId = await createEnvelope();
      }
    }

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
    let accessToken: string;
    try {
      accessToken = await getAccessTokenJWT();
    } catch (e) {
      console.error("DocuSign JWT token error:", e);
      return new Response(JSON.stringify({ error: `DocuSign JWT token error: ${String(e)}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
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

    // Create recipient view for embedded signing (retry once on failure by recreating envelope)
    async function createRecipientView(currentEnvelopeId: string) {
      const url = `${basePath}/v2.1/accounts/${accountId}/envelopes/${currentEnvelopeId}/views/recipient`;
      console.log("Requesting recipient view:", url, "for role:", role);
      const resp = await fetch(url, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${accessToken}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(viewReq),
      });
      const text = await resp.text();
      console.log("recipient view status:", resp.status, "body:", text);
      if (!resp.ok) {
        throw new Error(`recipient view failed ${resp.status}: ${text}`);
      }
      return JSON.parse(text);
    }

    let viewJson: any;
    try {
      viewJson = await createRecipientView(envelopeId);
    } catch (e) {
      console.warn("First attempt at recipient view failed, recreating envelope and retrying...", e);
      envelopeId = await createEnvelope();
      viewJson = await createRecipientView(envelopeId);
    }
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
}); ''
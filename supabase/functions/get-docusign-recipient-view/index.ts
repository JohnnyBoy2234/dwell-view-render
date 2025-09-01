// @ts-nocheck
// Returns a DocuSign embedded signing URL for tenant or landlord.
// If no envelope exists yet for the tenancy, creates one first.

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
  const exp = now + 9 * 60;
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
    const { tenancyId, role } = await req.json();
    if (!tenancyId || !role || (role !== "tenant" && role !== "landlord")) {
      return new Response(JSON.stringify({ error: "tenancyId and role ('tenant'|'landlord') are required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load tenancy
    const { data: tenancy, error: tErr } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, lease_document_path, envelope_id, signing_provider")
      .eq("id", tenancyId)
      .maybeSingle();
    if (tErr || !tenancy) {
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!tenancy.lease_document_path) {
      return new Response(JSON.stringify({ error: "Lease document not found. Generate lease first." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Load user profiles + emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", [tenancy.tenant_id, tenancy.landlord_id]);
    const nameById: Record<string, string> = {};
    for (const p of profiles || []) nameById[p.user_id] = p.display_name;
    const tenantUser = await supabase.auth.admin.getUserById(tenancy.tenant_id);
    const landlordUser = await supabase.auth.admin.getUserById(tenancy.landlord_id);
    const tenantEmail = tenantUser.data?.user?.email;
    const landlordEmail = landlordUser.data?.user?.email;
    if (!tenantEmail || !landlordEmail) {
      return new Response(JSON.stringify({ error: "Missing tenant or landlord email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const accessToken = await getAccessTokenJWT();
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Server misconfigured: DOCUSIGN_ACCOUNT_ID" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Ensure envelope exists; create if missing
    let envelopeId = tenancy.envelope_id as string | null;
    if (!envelopeId || tenancy.signing_provider !== "docusign") {
      const { data: file, error: dErr } = await supabase.storage.from("lease-documents").download(tenancy.lease_document_path);
      if (dErr || !file) {
        return new Response(JSON.stringify({ error: "Failed to download lease PDF" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const documentBase64 = b64encode(new Uint8Array(await file.arrayBuffer()));

      const tenantSigner = {
        email: tenantEmail,
        name: nameById[tenancy.tenant_id] || "Tenant",
        recipientId: "1",
        routingOrder: "1",
        clientUserId: tenancy.tenant_id,
        roleName: "tenant",
        tabs: {
          signHereTabs: [{ anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" }],
          dateSignedTabs: [{ anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "200" }],
          fullNameTabs: [{ anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "-200" }],
          initialHereTabs: [{ anchorString: "SWIFTRENT_INIT_TENANT_1", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" }],
        },
      } as any;
      const landlordSigner = {
        email: landlordEmail,
        name: nameById[tenancy.landlord_id] || "Landlord",
        recipientId: "2",
        routingOrder: "2",
        clientUserId: tenancy.landlord_id,
        roleName: "landlord",
        tabs: {
          signHereTabs: [{ anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" }],
          dateSignedTabs: [{ anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "200" }],
          fullNameTabs: [{ anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "-200" }],
          initialHereTabs: [{ anchorString: "SWIFTRENT_INIT_LANDLORD", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" }],
        },
      } as any;

      const envelopeDefinition = {
        emailSubject: "Lease Agreement",
        status: "sent",
        documents: [{ documentBase64, name: "Lease.pdf", fileExtension: "pdf", documentId: "1" }],
        recipients: { signers: [tenantSigner, landlordSigner] },
      };

      const createResp = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(envelopeDefinition),
      });
      if (!createResp.ok) {
        const errText = await createResp.text();
        return new Response(JSON.stringify({ error: `DocuSign create envelope failed: ${createResp.status} ${errText}` }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      const env = await createResp.json();
      envelopeId = env.envelopeId as string;
      await supabase
        .from("tenancies")
        .update({ envelope_id: envelopeId, signing_provider: "docusign" })
        .eq("id", tenancyId);
    }

    // Build recipient view
    const isTenant = role === "tenant";
    const email = isTenant ? tenantEmail : landlordEmail;
    const name = isTenant ? (nameById[tenancy.tenant_id] || "Tenant") : (nameById[tenancy.landlord_id] || "Landlord");
    const clientUserId = isTenant ? tenancy.tenant_id : tenancy.landlord_id;
    const appBase = Deno.env.get("APP_BASE_URL") || SUPABASE_URL || "https://example.com";
    const returnUrl = isTenant
      ? `${appBase}/enhancedtenantdashboard/leases?signing=complete`
      : `${appBase}/enhancedlandlorddashboard/leases?signing=complete`;

    const viewReq = {
      returnUrl,
      authenticationMethod: "none",
      email,
      userName: name,
      clientUserId,
    };

    const viewResp = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(viewReq),
    });
    if (!viewResp.ok) {
      const errText = await viewResp.text();
      return new Response(JSON.stringify({ error: `DocuSign recipient view failed: ${viewResp.status} ${errText}` }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const viewJson = await viewResp.json();
    const url = viewJson.url as string;
    return new Response(JSON.stringify({ url }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

// @ts-nocheck
// DocuSign: generate embedded recipient view (signing URL) for tenant or landlord
// Request body: { tenancyId: string, role: 'tenant'|'landlord', returnUrl?: string }
// Secrets required (same as create-docusign-envelope):
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// - DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_IMPERSONATED_USER_ID, DOCUSIGN_AUTH_SERVER, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_BASE_PATH

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
  const exp = now + 9 * 60;
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
    return new Response(null, { headers: { ...corsHeaders } });
  }
  try {
    const { tenancyId, role, returnUrl } = await req.json();
    if (!tenancyId || !role) {
      return new Response(JSON.stringify({ error: "tenancyId and role are required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (role !== "tenant" && role !== "landlord") {
      return new Response(JSON.stringify({ error: "role must be 'tenant' or 'landlord'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load tenancy
    const { data: tenancy, error: tErr } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, envelope_id")
      .eq("id", tenancyId)
      .maybeSingle();
    if (tErr || !tenancy) {
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (!tenancy.envelope_id) {
      return new Response(JSON.stringify({ error: "Envelope not created yet" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userId = role === "tenant" ? tenancy.tenant_id : tenancy.landlord_id;

    // Names
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr || !profile) {
      return new Response(JSON.stringify({ error: "Failed to load recipient profile" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Emails via Admin API
    const user = await supabase.auth.admin.getUserById(userId);
    const email = user.data?.user?.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "Recipient email not found" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const accessToken = await getAccessTokenJWT();
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Server misconfigured: DOCUSIGN_ACCOUNT_ID" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body = {
      returnUrl: returnUrl || "https://docusign.com/close",
      authenticationMethod: "none",
      email,
      userName: profile.display_name || role,
      clientUserId: userId, // must match the value used in envelope signers
    };

    const resp = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes/${tenancy.envelope_id}/views/recipient`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `DocuSign recipient view failed: ${resp.status} ${errText}` }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const json = await resp.json();
    return new Response(JSON.stringify({ url: json.url }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

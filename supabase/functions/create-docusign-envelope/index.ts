// @ts-nocheck
// DocuSign: create envelope from an existing lease PDF in Storage using tenancy data
// Secrets required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - DOCUSIGN_INTEGRATION_KEY
// - DOCUSIGN_IMPERSONATED_USER_ID
// - DOCUSIGN_AUTH_SERVER (e.g., account-d.docusign.com)
// - DOCUSIGN_ACCOUNT_ID
// - DOCUSIGN_BASE_PATH (e.g., https://demo.docusign.net/restapi)

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
  const rsaPrivateKeyRaw = Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY") || "";
  const rsaPrivateKeyPem = rsaPrivateKeyRaw.includes("\\n") ? rsaPrivateKeyRaw.replace(/\\n/g, "\n") : rsaPrivateKeyRaw;
  if (!integrationKey || !impersonatedUserId || !rsaPrivateKeyPem) {
    throw new Error("Missing DocuSign JWT secrets");
  }
  // jose requires PKCS8; if PEM is PKCS1, conversion would be needed. Assume PKCS8.
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
  // Deno compatible base64
  return btoa(String.fromCharCode(...uint8));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { ...corsHeaders } });
  }
  try {
    const { tenancyId } = await req.json();
    if (!tenancyId) {
      return new Response(JSON.stringify({ error: "tenancyId is required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch tenancy core fields
    const { data: tenancy, error: tErr } = await supabase
      .from("tenancies")
      .select("id, tenant_id, landlord_id, lease_document_path")
      .eq("id", tenancyId)
      .maybeSingle();
    if (tErr || !tenancy) {
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Fetch names from profiles
    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", [tenancy.tenant_id, tenancy.landlord_id]);
    if (pErr) {
      return new Response(JSON.stringify({ error: "Failed to load profiles" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const nameById: Record<string, string> = {};
    for (const p of profiles || []) nameById[p.user_id] = p.display_name;

    // Fetch emails via Admin API
    const tenantUser = await supabase.auth.admin.getUserById(tenancy.tenant_id);
    const landlordUser = await supabase.auth.admin.getUserById(tenancy.landlord_id);
    const tenantEmail = tenantUser.data?.user?.email;
    const landlordEmail = landlordUser.data?.user?.email;
    if (!tenantEmail || !landlordEmail) {
      return new Response(JSON.stringify({ error: "Missing tenant or landlord email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Ensure we have a PDF in Storage
    const leasePath = tenancy.lease_document_path as string | null;
    if (!leasePath) {
      return new Response(JSON.stringify({ error: "Lease document not found. Generate lease first." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: file, error: dErr } = await supabase.storage.from("lease-documents").download(leasePath);
    if (dErr || !file) {
      return new Response(JSON.stringify({ error: "Failed to download lease PDF" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const pdfBytes = new Uint8Array(await file.arrayBuffer());
    const documentBase64 = b64encode(pdfBytes);

    // Acquire DocuSign access token via JWT
    const accessToken = await getAccessTokenJWT();

    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const basePath = Deno.env.get("DOCUSIGN_BASE_PATH") || "https://demo.docusign.net/restapi";
    if (!accountId) {
      return new Response(JSON.stringify({ error: "Server misconfigured: DOCUSIGN_ACCOUNT_ID" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Build recipients
    const tenantSigner = {
      email: tenantEmail,
      name: nameById[tenancy.tenant_id] || "Tenant",
      recipientId: "1",
      routingOrder: "1",
      clientUserId: tenancy.tenant_id, // required for embedded signing view
      roleName: "tenant",
      tabs: {
        signHereTabs: [
          { anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" },
        ],
        dateSignedTabs: [
          { anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "200" },
        ],
        fullNameTabs: [
          { anchorString: "SWIFTRENT_SIGN_TENANT_1", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "-200" },
        ],
        initialHereTabs: [
          { anchorString: "SWIFTRENT_INIT_TENANT_1", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" },
        ],
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
        signHereTabs: [
          { anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" },
        ],
        dateSignedTabs: [
          { anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "200" },
        ],
        fullNameTabs: [
          { anchorString: "SWIFTRENT_SIGN_LANDLORD", anchorUnits: "pixels", anchorYOffset: "-15", anchorXOffset: "-200" },
        ],
        initialHereTabs: [
          { anchorString: "SWIFTRENT_INIT_LANDLORD", anchorUnits: "pixels", anchorYOffset: "0", anchorXOffset: "0" },
        ],
      },
    } as any;

    const signers = [tenantSigner, landlordSigner];

    const envelopeDefinition = {
      emailSubject: "Lease Agreement",
      status: "sent", // send immediately
      documents: [
        {
          documentBase64,
          name: "Lease.pdf",
          fileExtension: "pdf",
          documentId: "1",
        },
      ],
      recipients: {
        signers,
      },
    };

    const resp = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeDefinition),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({ error: `DocuSign create envelope failed: ${resp.status} ${errText}` }), { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const env = await resp.json();
    const envelopeId = env.envelopeId as string;

    // Update tenancy
    const { error: uErr } = await supabase
      .from("tenancies")
      .update({ envelope_id: envelopeId, signing_provider: "docusign", lease_status: "awaiting_tenant_signature" })
      .eq("id", tenancyId);
    if (uErr) {
      return new Response(JSON.stringify({ error: "Failed to update tenancy with envelope id" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ envelopeId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

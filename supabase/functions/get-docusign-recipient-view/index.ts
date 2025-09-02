import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as jose from "https://esm.sh/jose@5.8.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DS_BASE = Deno.env.get("DOCUSIGN_BASE_PATH") ?? "https://demo.docusign.net";
const DS_AUTH = Deno.env.get("DOCUSIGN_AUTH_SERVER") ?? "https://account-d.docusign.com";
const INTEGRATION_KEY = Deno.env.get("DOCUSIGN_INTEGRATION_KEY")!;
const USER_ID = Deno.env.get("DOCUSIGN_IMPERSONATED_USER_ID")!;
const ACCOUNT_ID = Deno.env.get("DOCUSIGN_ACCOUNT_ID")!;
const PRIVATE_KEY = (Deno.env.get("DOCUSIGN_RSA_PRIVATE_KEY") ?? "").replaceAll("\\n", "\n");

async function getAccessTokenWithJWT(): Promise<string> {
  console.log("=== Getting DocuSign access token with JWT ===");
  
  try {
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new jose.SignJWT({
        "scope": "signature impersonation"
      })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt(now)
      .setIssuer(INTEGRATION_KEY)
      .setSubject(USER_ID)
      .setAudience(`${DS_AUTH}/oauth/token`)
      .setExpirationTime(now + (60 * 5)) // 5 minutes
      .sign(await jose.importPKCS8(PRIVATE_KEY, "RS256"));

    console.log("JWT created, making token request to:", `${DS_AUTH}/oauth/token`);
    
    const resp = await fetch(`${DS_AUTH}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("DocuSign JWT token error:", resp.status, text);
      throw new Error(`DocuSign JWT token error: ${resp.status} ${text}`);
    }
    
    const json = await resp.json();
    console.log("Successfully obtained access token");
    return json.access_token as string;
  } catch (error) {
    console.error("Error in getAccessTokenWithJWT:", error);
    throw error;
  }
}

serve(async (req) => {
  console.log("=== DocuSign Recipient View Function Started ===");
  console.log("Request method:", req.method);
  
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
        status: 405,
        headers: corsHeaders 
      });
    }

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { envelopeId, recipientEmail, recipientName, clientUserId, returnUrl } = body;

    if (!envelopeId || !recipientEmail || !recipientName || !clientUserId) {
      console.error("Missing required fields:", { envelopeId: !!envelopeId, recipientEmail: !!recipientEmail, recipientName: !!recipientName, clientUserId: !!clientUserId });
      return new Response("Missing required fields: envelopeId, recipientEmail, recipientName, clientUserId", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    console.log("Getting DocuSign access token...");
    const accessToken = await getAccessTokenWithJWT();

    const recipientViewUrl = `${DS_BASE}/restapi/v2.1/accounts/${ACCOUNT_ID}/envelopes/${encodeURIComponent(envelopeId)}/views/recipient`;
    console.log("Making recipient view request to:", recipientViewUrl);
    
    const viewPayload = {
      returnUrl: returnUrl ?? `${Deno.env.get("APP_BASE_URL")}/docusign/complete`,
      authenticationMethod: "none",
      email: recipientEmail,
      userName: recipientName,
      clientUserId: String(clientUserId),
    };
    
    console.log("Recipient view payload:", JSON.stringify(viewPayload, null, 2));

    const viewResp = await fetch(recipientViewUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(viewPayload),
    });

    console.log("Recipient view response status:", viewResp.status);
    
    if (!viewResp.ok) {
      const txt = await viewResp.text();
      console.error("Recipient view error:", viewResp.status, txt);
      return new Response(`Recipient view error: ${viewResp.status} ${txt}`, { 
        status: 502,
        headers: corsHeaders 
      });
    }

    const view = await viewResp.json();
    console.log("Successfully created recipient view");
    
    return new Response(JSON.stringify({ url: view.url }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("Server error in recipient view function:", error);
    return new Response(`Server error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders 
    });
  }
});
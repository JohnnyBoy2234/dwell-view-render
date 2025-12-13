// @ts-nocheck
// DocuSign OAuth2 Authorization Code Grant initiation
// This function generates the authorization URL and redirects the user to DocuSign

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { tenancyId, role } = await req.json();

    if (!tenancyId || !role) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenancyId, role" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const clientId = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
    const redirectUri = Deno.env.get("DOCUSIGN_REDIRECT_URI") || "https://rentlekker.com/auth/callback";
    const authServer = Deno.env.get("DOCUSIGN_AUTH_SERVER") || "account-d.docusign.com";

    if (!clientId) {
      throw new Error("Missing DOCUSIGN_INTEGRATION_KEY");
    }

    // Generate state parameter to track the request
    const state = btoa(JSON.stringify({ tenancyId, role, timestamp: Date.now() }));

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code verifier temporarily (you might want to store this in a database)
    // For now, we'll include it in the state
    const stateWithVerifier = btoa(JSON.stringify({ 
      tenancyId, 
      role, 
      timestamp: Date.now(),
      codeVerifier 
    }));

    // Build authorization URL
    const authUrl = new URL(`https://${authServer}/oauth/auth`);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", "signature impersonation");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", stateWithVerifier);
    authUrl.searchParams.append("code_challenge", codeChallenge);
    authUrl.searchParams.append("code_challenge_method", "S256");

    console.log("Generated authorization URL:", authUrl.toString());

    return new Response(
      JSON.stringify({ 
        authUrl: authUrl.toString(),
        state: stateWithVerifier 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Auth initiation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

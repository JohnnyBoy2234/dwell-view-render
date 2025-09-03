// @ts-nocheck
// DocuSign OAuth2 Authorization Code Grant callback handler
// This function handles the callback from DocuSign after user authorization

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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    console.log("OAuth callback received:", { code: !!code, state, error });

    if (error) {
      console.error("OAuth error:", error);
      return new Response(
        JSON.stringify({ error: `OAuth error: ${error}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "No authorization code received" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code, state);
    
    if (!tokenResponse.access_token) {
      return new Response(
        JSON.stringify({ error: "Failed to get access token" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Store the access token temporarily (you might want to store this in a database)
    // For now, we'll return it to the frontend
    return new Response(
      JSON.stringify({ 
        success: true, 
        access_token: tokenResponse.access_token,
        state: state 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function exchangeCodeForToken(code: string, state: string) {
  const clientId = Deno.env.get("DOCUSIGN_INTEGRATION_KEY");
  const clientSecret = Deno.env.get("DOCUSIGN_CLIENT_SECRET");
  const redirectUri = Deno.env.get("DOCUSIGN_REDIRECT_URI") || "https://swiftrent.co.za/auth/callback";
  const authServer = Deno.env.get("DOCUSIGN_AUTH_SERVER") || "account-d.docusign.com";

  if (!clientId || !clientSecret) {
    throw new Error("Missing DocuSign client credentials");
  }

  // Parse state to get code verifier
  const stateData = JSON.parse(atob(state));
  const codeVerifier = stateData.codeVerifier;

  const tokenUrl = `https://${authServer}/oauth/token`;
  
  const formData = new URLSearchParams();
  formData.append("grant_type", "authorization_code");
  formData.append("code", code);
  formData.append("redirect_uri", redirectUri);
  formData.append("client_id", clientId);
  formData.append("client_secret", clientSecret);
  formData.append("code_verifier", codeVerifier);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

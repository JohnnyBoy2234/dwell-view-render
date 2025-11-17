import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, accept, accept-language, origin, referer, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function generateAuthToken(salt: string, orgId: string, timestamp: number): Promise<string> {
  const stringToHash = `${salt}_${orgId}_${timestamp}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(stringToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  try {
    console.log("callpay-test: Request received -", req.method, req.url);

    if (req.method === "OPTIONS") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const CALLPAY_ORG_ID = Deno.env.get("CALLPAY_ORGANISATION_ID") ?? "";
    const CALLPAY_API_SALT = Deno.env.get("CALLPAY_API_SALT") ?? "";
    const CALLPAY_MODE = Deno.env.get("CALLPAY_MODE") ?? "sandbox";

    console.log("=== CallPay Credentials Test ===");
    console.log("Environment Variables Check:");
    console.log("- CALLPAY_ORGANISATION_ID exists:", !!CALLPAY_ORG_ID);
    console.log("- CALLPAY_ORGANISATION_ID value:", CALLPAY_ORG_ID);
    console.log("- CALLPAY_API_SALT exists:", !!CALLPAY_API_SALT);
    console.log("- CALLPAY_API_SALT length:", CALLPAY_API_SALT?.length);
    console.log("- CALLPAY_API_SALT (first 5 chars):", CALLPAY_API_SALT?.substring(0, 5) + "...");
    console.log("- CALLPAY_MODE:", CALLPAY_MODE);

    if (!CALLPAY_ORG_ID || !CALLPAY_API_SALT) {
      return new Response(JSON.stringify({ 
        error: "Missing credentials",
        details: {
          orgIdExists: !!CALLPAY_ORG_ID,
          saltExists: !!CALLPAY_API_SALT,
        }
      }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const stringToHash = `${CALLPAY_API_SALT}_${CALLPAY_ORG_ID}_${timestamp}`;
    const authToken = await generateAuthToken(CALLPAY_API_SALT, CALLPAY_ORG_ID, timestamp);

    console.log("\n=== Authentication Details ===");
    console.log("Timestamp:", timestamp);
    console.log("String to hash:", stringToHash);
    console.log("Generated Auth-Token:", authToken);

    const callpayBaseUrl = "https://payments.onegate.co.za";
    const testUrl = `${callpayBaseUrl}/api/v2/organisation/${CALLPAY_ORG_ID}/services`;

    console.log("\n=== Test API Call ===");
    console.log("URL:", testUrl);
    console.log("Headers:", {
      "Auth-Token": authToken,
      "Org-Id": CALLPAY_ORG_ID,
      "Timestamp": timestamp.toString(),
    });

    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "Auth-Token": authToken,
        "Org-Id": CALLPAY_ORG_ID,
        "Timestamp": timestamp.toString(),
      },
    });

    console.log("\n=== API Response ===");
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);

    const responseText = await response.text();
    console.log("Response Body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        success: false,
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        debugInfo: {
          orgId: CALLPAY_ORG_ID,
          timestamp,
          stringToHash,
          authToken,
          url: testUrl,
        }
      }), { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      status: response.status,
      data: responseData,
      debugInfo: {
        orgId: CALLPAY_ORG_ID,
        timestamp,
        stringToHash,
        authToken,
        url: testUrl,
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (e: any) {
    console.error("callpay-test: Error:", e);
    console.error("callpay-test: Stack:", e?.stack);
    return new Response(JSON.stringify({ 
      success: false,
      error: e?.message || "Unexpected error",
      stack: e?.stack,
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});

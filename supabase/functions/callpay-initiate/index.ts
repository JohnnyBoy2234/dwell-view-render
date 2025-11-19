import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("callpay-initiate: Request received -", req.method, req.url);
    console.log("callpay-initiate: Origin:", req.headers.get("origin"));

    if (req.method === "OPTIONS") {
      console.log("callpay-initiate: Handling OPTIONS preflight");
      console.log("callpay-initiate: CORS headers being returned:", corsHeaders);
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const { plan_code, amount, item_name, item_description } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const user = userData.user;
    const CALLPAY_ORG_ID = (Deno.env.get("CALLPAY_ORGANISATION_ID") ?? "").trim();
    const CALLPAY_API_SALT = (Deno.env.get("CALLPAY_API_SALT") ?? "").trim();
    const CALLPAY_MODE = Deno.env.get("CALLPAY_MODE") ?? "sandbox";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";

    const timestamp = Math.floor(Date.now() / 1000);
    const authToken = await generateAuthToken(CALLPAY_API_SALT, CALLPAY_ORG_ID, timestamp);

    const merchantReference = `${plan_code}-${user.id}-${Date.now()}`;
    const callpayBaseUrl = CALLPAY_MODE === "live" 
      ? "https://payments.onegate.co.za" 
      : "https://payments.onegate.co.za";

    const notifyUrl = `${SUPABASE_URL}/functions/v1/callpay-webhook`;

    // ENHANCED DEBUGGING LOGS
    console.log("=== CallPay Authentication Debug ===");
    console.log("Org ID:", CALLPAY_ORG_ID);
    console.log("Org ID length:", CALLPAY_ORG_ID.length);
    console.log("Org ID (JSON):", JSON.stringify(CALLPAY_ORG_ID));
    console.log("Timestamp:", timestamp);
    console.log("Salt:", CALLPAY_API_SALT);
    console.log("Salt length:", CALLPAY_API_SALT.length);
    console.log("Salt (JSON):", JSON.stringify(CALLPAY_API_SALT));
    console.log("String to hash:", `${CALLPAY_API_SALT}_${CALLPAY_ORG_ID}_${timestamp}`);
    console.log("String to hash length:", `${CALLPAY_API_SALT}_${CALLPAY_ORG_ID}_${timestamp}`.length);
    console.log("Generated Auth-Token:", authToken);
    console.log("Mode:", CALLPAY_MODE);
    console.log("Base URL:", callpayBaseUrl);
    
    console.log("=== Payment Details ===");
    console.log("Merchant Reference:", merchantReference);
    console.log("Amount:", amount);
    console.log("Plan Code:", plan_code);
    console.log("Notify URL:", notifyUrl);
    console.log("Customer Email:", user.email);

    const requestHeaders = {
      "Auth-Token": authToken,
      "Org-Id": CALLPAY_ORG_ID,
      "Timestamp": timestamp.toString(),
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const requestBody = {
      payment_type: "eft",
      amount: amount.toString(),
      merchant_reference: merchantReference,
      customer_reference: user.email || "",
      success_url: `${APP_BASE_URL}/payment-success?provider=callpay`,
      error_url: `${APP_BASE_URL}/pricing?error=1`,
      cancel_url: `${APP_BASE_URL}/pricing?canceled=1`,
      notify_url: notifyUrl,
      currency_code: "ZAR",
    };

    console.log("=== API Request Details ===");
    console.log("URL:", `${callpayBaseUrl}/api/v2/payment-key`);
    console.log("Headers:", JSON.stringify(requestHeaders, null, 2));
    console.log("Body:", JSON.stringify(requestBody, null, 2));

    const paymentKeyResponse = await fetch(`${callpayBaseUrl}/api/v2/payment-key`, {
      method: "POST",
      headers: requestHeaders,
      body: new URLSearchParams(requestBody),
    });

    console.log("=== API Response ===");
    console.log("Status:", paymentKeyResponse.status);
    console.log("Status Text:", paymentKeyResponse.statusText);

    if (!paymentKeyResponse.ok) {
      const errorText = await paymentKeyResponse.text();
      console.error("=== CallPay API ERROR ===");
      console.error("Status:", paymentKeyResponse.status);
      console.error("Response:", errorText);
      console.error("=== Credentials Check ===");
      console.error("Org ID exists:", !!CALLPAY_ORG_ID);
      console.error("Salt exists:", !!CALLPAY_API_SALT);
      console.error("Mode:", CALLPAY_MODE);
      
      let errorMessage = `CallPay API error (${paymentKeyResponse.status}): ${errorText}`;
      if (paymentKeyResponse.status === 401) {
        errorMessage += "\n\nPossible causes:\n1. API Salt doesn't match CallPay dashboard\n2. Organisation ID is incorrect\n3. Timestamp outside 15-minute window\n4. API access not enabled in CallPay account";
      }
      throw new Error(errorMessage);
    }

    const paymentData = await paymentKeyResponse.json();
    console.log("CallPay payment key created:", paymentData);

    // Store pending payment info
    await admin.from("billing_payments").insert({
      provider: "callpay",
      reference: merchantReference,
      user_id: user.id,
      plan_code: plan_code,
      amount: Number(amount),
      status: "pending",
      raw: { payment_key: paymentData.key, item_name },
    });

    return new Response(JSON.stringify({ 
      payment_key: paymentData.key,
      origin: callpayBaseUrl,
      url: paymentData.url 
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("callpay-initiate: Top-level error:", e);
    console.error("callpay-initiate: Error stack:", e?.stack);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});

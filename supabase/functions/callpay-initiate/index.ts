import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
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
    const CALLPAY_ORG_ID = Deno.env.get("CALLPAY_ORGANISATION_ID") ?? "";
    const CALLPAY_API_SALT = Deno.env.get("CALLPAY_API_SALT") ?? "";
    const CALLPAY_MODE = Deno.env.get("CALLPAY_MODE") ?? "sandbox";
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";

    const timestamp = Math.floor(Date.now() / 1000);
    const authToken = await generateAuthToken(CALLPAY_API_SALT, CALLPAY_ORG_ID, timestamp);

    const merchantReference = `${plan_code}-${user.id}-${Date.now()}`;
    const callpayBaseUrl = CALLPAY_MODE === "live" 
      ? "https://payments.onegate.co.za" 
      : "https://payments.onegate.co.za";

    const notifyUrl = `${SUPABASE_URL}/functions/v1/callpay-webhook`;

    console.log("Initiating CallPay payment:", {
      merchantReference,
      amount,
      plan_code,
      notifyUrl
    });

    const paymentKeyResponse = await fetch(`${callpayBaseUrl}/api/v2/payment-key`, {
      method: "POST",
      headers: {
        "Auth-Token": authToken,
        "Org-Id": CALLPAY_ORG_ID,
        "Timestamp": timestamp.toString(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        payment_type: "eft",
        amount: amount.toString(),
        merchant_reference: merchantReference,
        customer_reference: user.email || "",
        success_url: `${APP_BASE_URL}/payment-success?provider=callpay`,
        error_url: `${APP_BASE_URL}/pricing?error=1`,
        cancel_url: `${APP_BASE_URL}/pricing?canceled=1`,
        notify_url: notifyUrl,
        currency_code: "ZAR",
      }),
    });

    if (!paymentKeyResponse.ok) {
      const errorText = await paymentKeyResponse.text();
      console.error("CallPay API error:", errorText);
      throw new Error(`CallPay API error: ${errorText}`);
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
    console.error("callpay-initiate error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});

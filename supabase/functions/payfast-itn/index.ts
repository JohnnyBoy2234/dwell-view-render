import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toQueryString(body: URLSearchParams) {
  const keys = Array.from(body.keys()).sort();
  return keys.map((k) => `${k}=${encodeURIComponent(body.get(k) ?? "")}`).join("&");
}

async function sha512Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-512", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? undefined;

    // Verify signature
    const signature = params.get("signature") || "";
    params.delete("signature");
    const queryStr = toQueryString(params) + (passphrase ? `&passphrase=${encodeURIComponent(passphrase)}` : "");
    const calcSig = await sha512Hex(queryStr);
    if (calcSig !== signature) {
      console.error("Invalid PayFast signature");
      return new Response("invalid signature", { status: 400, headers: corsHeaders });
    }

    // Basic ITN handling
    const paymentStatus = params.get("payment_status");
    const planCode = params.get("custom_str1") || "";
    const userId = params.get("custom_str2") || "";
    const grossAmount = params.get("amount_gross") || params.get("amount") || "0";
    const pfPaymentId = params.get("pf_payment_id") || null;
    const mPaymentId = params.get("m_payment_id") || null;

    // Record transaction
    await admin.from("billing_payments").insert({
      provider: "payfast",
      pf_payment_id: pfPaymentId,
      reference: mPaymentId,
      user_id: userId,
      plan_code: planCode,
      amount: Number(grossAmount || 0),
      status: paymentStatus,
      raw: Object.fromEntries(params.entries()),
    });

    if (paymentStatus === "COMPLETE") {
      // Activate plan
      await admin.from("billing_subscriptions").upsert({
        user_id: userId,
        plan_code: planCode,
        status: "active",
        provider: "payfast",
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      // Notify user
      await admin.rpc('create_notification', {
        _user_id: userId,
        _message: `Your RentLekker ${planCode} plan is now active. Thank you!`,
        _link_url: '/enhancedtenantdashboard',
        _type: 'billing_update',
        _metadata: { planCode, provider: 'payfast' }
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e: any) {
    console.error("payfast-itn error", e);
    return new Response("ERROR", { status: 500, headers: corsHeaders });
  }
});



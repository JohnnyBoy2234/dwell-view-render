import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function encodeRFC3986(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildSignature(fields: Record<string, string>, passphrase?: string) {
  const pairs: string[] = [];
  const keys = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null && fields[k] !== "")
    .sort();
  for (const k of keys) {
    if (k.toLowerCase() === "signature") continue;
    pairs.push(`${k}=${encodeRFC3986(fields[k])}`);
  }
  if (passphrase) {
    pairs.push(`passphrase=${encodeRFC3986(passphrase)}`);
  }
  const queryString = pairs.join("&");
  const data = new TextEncoder().encode(queryString);
  const digest = (async () => {
    const buf = await crypto.subtle.digest("SHA-512", data);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  })();
  return digest;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan_code, amount, item_name, item_description } = await req.json();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const user = userData.user;
    const buyerEmail = user.email ?? "";

    const merchant_id = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "";
    const merchant_key = Deno.env.get("PAYFAST_MERCHANT_KEY") ?? "";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? undefined;
    const mode = (Deno.env.get("PAYFAST_MODE") ?? "sandbox").toLowerCase();
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";
    const NOTIFY_URL = Deno.env.get("PAYFAST_NOTIFY_URL") ?? ""; // should point to supabase function payfast-itn

    const return_url = `${APP_BASE_URL}/payment-success?provider=payfast`;
    const cancel_url = `${APP_BASE_URL}/pricing?canceled=1`;

    const pfEndpoint = mode === "live" ? "https://www.payfast.co.za/eng/process" : "https://sandbox.payfast.co.za/eng/process";

    const paymentFields: Record<string, string> = {
      merchant_id,
      merchant_key,
      return_url,
      cancel_url,
      notify_url: NOTIFY_URL,
      name_first: user.user_metadata?.first_name ?? "",
      name_last: user.user_metadata?.last_name ?? "",
      email_address: buyerEmail,
      m_payment_id: `${plan_code}-${user.id}-${Date.now()}`,
      amount: (Number(amount || 0)).toFixed(2),
      item_name: item_name || plan_code,
      item_description: item_description || plan_code,
      custom_str1: plan_code || "",
      custom_str2: user.id,
    };

    const signature = await buildSignature(paymentFields, passphrase);
    const fieldsWithSignature = { ...paymentFields, signature };

    return new Response(JSON.stringify({ url: pfEndpoint, fields: fieldsWithSignature }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("payfast-initiate error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});



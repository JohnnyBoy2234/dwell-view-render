import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_IPS = ["54.72.191.28", "54.194.139.201"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || "";
    
    console.log("Webhook received from IP:", clientIP);
    
    // IP whitelist check (log warning but don't block in sandbox)
    const mode = Deno.env.get("CALLPAY_MODE") ?? "sandbox";
    if (mode === "live" && !ALLOWED_IPS.includes(clientIP)) {
      console.warn("Webhook from unauthorized IP:", clientIP);
      return new Response("Unauthorized IP", { status: 403, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);
    const webhookData: Record<string, string> = {};
    
    params.forEach((value, key) => {
      webhookData[key] = value;
    });

    console.log("CallPay webhook data:", webhookData);

    const success = webhookData.success === "1";
    const status = webhookData.status || "";
    const merchantReference = webhookData.merchant_reference || "";
    const amount = webhookData.amount || "0";
    const callpayTxId = webhookData.callpay_transaction_id || "";
    const gatewayReference = webhookData.gateway_reference || "";
    const paymentKey = webhookData.payment_key || "";

    // Find the payment record
    const { data: payment } = await admin
      .from("billing_payments")
      .select("*")
      .eq("reference", merchantReference)
      .single();

    if (!payment) {
      console.error("Payment not found for reference:", merchantReference);
      return new Response("Payment not found", { status: 404, headers: corsHeaders });
    }

    // Update payment record
    await admin
      .from("billing_payments")
      .update({
        status: success && status === "complete" ? "complete" : "failed",
        raw: webhookData,
        pf_payment_id: callpayTxId,
      })
      .eq("id", payment.id);

    if (success && status === "complete") {
      console.log("Payment successful, activating subscription");

      const now = new Date();

      // Activate subscription using correct column names
      await admin.from("billing_subscriptions").upsert({
        user_id: payment.user_id,
        plan_code: payment.plan_code,
        status: "active",
        provider: "callpay",
        started_at: now.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" });

      // Notify user
      await admin.rpc('create_notification', {
        _user_id: payment.user_id,
        _message: `Your RentLekker ${payment.plan_code} plan is now active. Thank you!`,
        _link_url: '/enhancedtenantdashboard',
        _type: 'billing_update',
        _metadata: { planCode: payment.plan_code, provider: 'callpay' }
      });

      console.log("Subscription activated for user:", payment.user_id);
    } else {
      console.log("Payment failed or incomplete:", { success, status });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e: any) {
    console.error("callpay-webhook error:", e);
    return new Response("ERROR", { status: 500, headers: corsHeaders });
  }
});

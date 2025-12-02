import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Get the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reference } = await req.json();
    
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[activate-subscription] Attempting to activate for user ${user.id} with reference ${reference}`);

    // Find the payment record
    const { data: payment, error: paymentError } = await admin
      .from("billing_payments")
      .select("*")
      .eq("reference", reference)
      .eq("user_id", user.id)
      .single();

    if (paymentError || !payment) {
      console.error("Payment not found:", paymentError);
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[activate-subscription] Found payment:`, { id: payment.id, status: payment.status, plan_code: payment.plan_code });

    // Check if payment is complete or pending (webhook might not have arrived yet)
    if (payment.status !== "complete" && payment.status !== "pending") {
      return new Response(JSON.stringify({ 
        error: "Payment not completed", 
        status: payment.status 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if subscription already exists and is active
    const { data: existingSub } = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      console.log(`[activate-subscription] User already has active subscription`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Subscription already active",
        subscription: existingSub
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Activate subscription
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setMonth(endsAt.getMonth() + 1); // 1 month subscription

    const { data: subscription, error: subError } = await admin
      .from("billing_subscriptions")
      .upsert({
        user_id: user.id,
        plan_code: payment.plan_code,
        status: "active",
        provider: "callpay",
        created_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: "user_id" })
      .select()
      .single();

    if (subError) {
      console.error("Error activating subscription:", subError);
      return new Response(JSON.stringify({ error: "Failed to activate subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment status if it was pending
    if (payment.status === "pending") {
      await admin
        .from("billing_payments")
        .update({ status: "complete" })
        .eq("id", payment.id);
    }

    // Create notification
    await admin.rpc("create_notification", {
      _user_id: user.id,
      _message: `Your RentLekker ${payment.plan_code} plan is now active. Thank you!`,
      _link_url: "/enhancedtenantdashboard",
      _type: "billing_update",
      _metadata: { planCode: payment.plan_code, provider: "callpay" },
    });

    console.log(`[activate-subscription] Successfully activated subscription for user ${user.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      subscription,
      message: "Subscription activated successfully"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[activate-subscription] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

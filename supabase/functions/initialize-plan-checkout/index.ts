import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUBSCRIPTION_PRICE_CENTS = 14900; // R149/month
const LISTING_FEE_CENTS = 9900; // R99 once-off
const PLAN_NAME = "MzanziHomes Landlord Subscription";

const logStep = (step: string, details?: unknown) =>
  console.log(`[INITIALIZE-PLAN-CHECKOUT] ${step}`, details ?? "");

async function paystack(path: string, secretKey: string, init?: RequestInit) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body.status === false) {
    throw new Error(`Paystack ${path} failed: ${body.message ?? res.status}`);
  }
  return body;
}

// Find-or-create the R149/month ZAR plan so we never hardcode a plan code.
// Note: this find-or-create is non-atomic — two concurrent first-ever checkouts could
// create duplicate Paystack plans. Harmless: both charge R149/mo, and once one exists
// the find path wins. Also, the interval/amount query filter on GET /plan is best-effort
// narrowing only; the authoritative match is the .find() on name + currency below.
async function ensurePlan(secretKey: string): Promise<string> {
  const list = await paystack(`/plan?interval=monthly&amount=${SUBSCRIPTION_PRICE_CENTS}`, secretKey);
  const existing = (list.data ?? []).find((p: any) => p.name === PLAN_NAME && p.currency === "ZAR");
  if (existing) return existing.plan_code;
  const created = await paystack("/plan", secretKey, {
    method: "POST",
    body: JSON.stringify({
      name: PLAN_NAME,
      interval: "monthly",
      amount: SUBSCRIPTION_PRICE_CENTS,
      currency: "ZAR",
    }),
  });
  return created.data.plan_code;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !user?.email) throw new Error("Not authenticated");

    const { purpose, property_id } = await req.json();
    if (purpose !== "listing_fee" && purpose !== "subscription") {
      throw new Error("purpose must be 'listing_fee' or 'subscription'");
    }
    if (purpose === "listing_fee" && !property_id) {
      throw new Error("property_id is required for listing_fee");
    }

    // Listing fee: verify the property belongs to this landlord and isn't already paid.
    if (purpose === "listing_fee") {
      const { data: prop, error: propErr } = await supabase
        .from("properties")
        .select("id, landlord_id")
        .eq("id", property_id)
        .single();
      if (propErr || !prop) throw new Error("Property not found");
      if (prop.landlord_id !== user.id) throw new Error("Not your property");
      // Advisory only — the UNIQUE(property_id) constraint on listing_payments (enforced when the webhook inserts) is the real double-payment guard; never treat this check as the authority on "already paid".
      const { data: paid } = await supabase
        .from("listing_payments")
        .select("id")
        .eq("property_id", property_id)
        .maybeSingle();
      if (paid) throw new Error("This listing is already paid for");
    }

    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("PAYSTACK_SECRET_KEY not configured");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const amount = purpose === "subscription" ? SUBSCRIPTION_PRICE_CENTS : LISTING_FEE_CENTS;
    const reference = purpose === "subscription"
      ? `SUB_${user.id.slice(0, 8)}_${Date.now()}`
      : `LISTING_${property_id}_${Date.now()}`;

    const initBody: Record<string, unknown> = {
      email: user.email,
      amount,
      currency: "ZAR",
      reference,
      callback_url: `${origin}/plan-success${property_id ? `?property=${property_id}` : ""}`,
      metadata: {
        purpose,
        landlord_id: user.id,
        ...(property_id ? { property_id } : {}),
      },
    };
    if (purpose === "subscription") {
      initBody.plan = await ensurePlan(secretKey); // Paystack creates the subscription on charge
    }

    logStep("Initializing", { purpose, reference, amount });
    const init = await paystack("/transaction/initialize", secretKey, {
      method: "POST",
      body: JSON.stringify(initBody),
    });

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: init.data.authorization_url,
        reference,
        amount,
        test_mode: secretKey.startsWith("sk_test"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    logStep("ERROR", { message: (e as Error).message });
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

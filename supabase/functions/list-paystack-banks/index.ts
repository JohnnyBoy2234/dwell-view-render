import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) throw new Error("PAYSTACK_SECRET_KEY is not set");

    const res = await fetch(
      "https://api.paystack.co/bank?country=south africa&currency=ZAR&perPage=200",
      { headers: { Authorization: `Bearer ${paystackSecretKey}` } }
    );
    const json = await res.json();
    if (!res.ok || !json.status) {
      throw new Error(json.message || `Paystack error: ${res.status}`);
    }

    // Return a lean, de-duplicated, alphabetically sorted list.
    const seen = new Set<string>();
    const banks = (json.data || [])
      .map((b: any) => ({ name: b.name, code: b.code }))
      .filter((b: any) => b.name && b.code && !seen.has(b.code) && seen.add(b.code))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return new Response(JSON.stringify({ banks }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error listing banks:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Failed to load banks" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

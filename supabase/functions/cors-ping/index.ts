import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, accept, accept-language, origin, referer, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    console.log("cors-ping: OPTIONS preflight");
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    console.log("cors-ping: Request received", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        time: Date.now(),
        message: "CORS working correctly",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (e: any) {
    console.error("cors-ping error:", e);
    return new Response(
      JSON.stringify({ error: e?.message || "Unexpected error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});

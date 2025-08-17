import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, redirectTo } = await req.json();
    if (!email || typeof email !== "string" || !code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "Email and code are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find user by email
    const { data: userRes, error: getUserErr } = await adminClient.auth.admin.getUserByEmail(email);
    if (getUserErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "No account found for this email" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = userRes.user;

    const nowIso = new Date().toISOString();
    const { data: latest, error: selectError } = await adminClient
      .from("verification_codes")
      .select("id, code_hash, expires_at, attempts")
      .eq("user_id", user.id)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error("Select error:", selectError);
      return new Response(JSON.stringify({ error: "Failed to verify code" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!latest) {
      return new Response(JSON.stringify({ error: "Code expired or not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if ((latest.attempts ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please restart sign-in." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ok = await bcrypt.compare(code, latest.code_hash);
    if (!ok) {
      const { data: updated, error: updateError } = await adminClient
        .from("verification_codes")
        .update({ attempts: (latest.attempts ?? 0) + 1 })
        .eq("id", latest.id)
        .select("attempts")
        .single();

      if (updateError) {
        console.error("Attempts update error:", updateError);
      }

      const attemptsLeft = Math.max(0, 3 - (updated?.attempts ?? (latest.attempts ?? 0) + 1));
      return new Response(JSON.stringify({ error: "Invalid code", attemptsLeft }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Success: clean up codes for this user
    await adminClient.from("verification_codes").delete().eq("user_id", user.id);

    // Generate a magic link to complete sign-in and set session
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: typeof redirectTo === "string" && redirectTo.length > 0 ? redirectTo : undefined,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      return new Response(JSON.stringify({ error: "Failed to generate sign-in link" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ verified: true, link: linkData.properties.action_link }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("verify-login-code error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
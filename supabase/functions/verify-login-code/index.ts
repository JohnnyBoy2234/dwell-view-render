import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// listUsers() is paginated (default 50/page); without walking pages this
// silently fails to find any user past page 1 once the user base grows.
async function findUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data?.users?.find((u) => u.email === email);
    if (match) return match;
    if (!data?.users || data.users.length < perPage) return null; // last page
  }
  return null;
}

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

    const user = await findUserByEmail(adminClient, email);

    if (!user) {
      // Same response shape as a wrong code — don't reveal whether this
      // email has an account.
      return new Response(JSON.stringify({ error: "Invalid code", attemptsLeft: 2 }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
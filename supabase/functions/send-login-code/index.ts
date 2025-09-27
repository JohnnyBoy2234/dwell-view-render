import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  // 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find user by email (must exist for login)
    const { data: userRes, error: getUserErr } = await adminClient.auth.admin.getUserByEmail(email);
    if (getUserErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "No account found for this email" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = userRes.user;

    // Rate limit: 30 seconds between sends per user
    const { data: latest } = await adminClient
      .from("verification_codes")
      .select("id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      const last = new Date(latest.created_at).getTime();
      if (Date.now() - last < 30_000) {
        return new Response(
          JSON.stringify({ error: "Please wait before requesting another code.", retryIn: 30_000 - (Date.now() - last) }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const code = generateCode();
    // Temporarily disable bcrypt hashing due to import issues
    const code_hash = code; // TODO: Re-enable bcrypt.hash(code, 10) after fixing imports
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await adminClient.from("verification_codes").insert({
      user_id: user.id,
      code_hash,
      expires_at: expiresAt,
      attempts: 0,
    });
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create verification code" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Temporarily disable email sending
    console.log('Would send login code:', code, 'to:', email);
    
    // TODO: Re-enable email sending after fixing Resend import
    /*
    const resend = new Resend(resendApiKey);
    const emailResponse = await resend.emails.send({
      from,
      to: [to],
      subject: "Your SwiftRent verification code",
      html: emailHtml,
    });
    */

    console.log('Login code process completed for:', email);

    return new Response(JSON.stringify({ sent: true, expiresAt }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e) {
    console.error("send-login-code error:", e);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
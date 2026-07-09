import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) =>
  console.log(`[SUBMIT-PROPERTY-LEAD] ${step}`, details ?? "");

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
    if (userErr || !user) throw new Error("Not authenticated");

    const { property_id, message, phone } = await req.json();
    if (!property_id) throw new Error("property_id is required");

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("id, title, location, landlord_id")
      .eq("id", property_id)
      .single();
    if (propErr || !property) throw new Error("Property not found");

    // Lead flow only applies to free landlords — subscribers use messaging.
    const { data: mode } = await supabase.rpc("get_property_contact_mode", {
      _property_id: property_id,
    });
    if (mode !== "lead") throw new Error("This landlord uses in-app messaging");

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    const tenantName = profile?.display_name || user.email || "A tenant";
    const tenantPhone = phone || profile?.phone || null;

    const { error: leadErr } = await supabase.from("inquiries").insert({
      property_id,
      tenant_id: user.id,
      name: tenantName,
      email: user.email,
      phone: tenantPhone,
      message: message || "I'm interested in this property.",
      status: "pending",
    });
    if (leadErr) throw new Error(`Could not save your enquiry: ${leadErr.message}`);

    const where = property.title || property.location || "your listing";
    const contactBits = [user.email, tenantPhone].filter(Boolean).join(" · ");
    await supabase.rpc("create_notification", {
      _user_id: property.landlord_id,
      _message: `New lead for ${where}: ${tenantName} (${contactBits}). Contact them directly.`,
      _link_url: "/enhancedlandlorddashboard",
      _type: "system",
      _metadata: { property_id, tenant_id: user.id, kind: "lead" },
    });

    // Email is best-effort — the in-app notification is the source of truth.
    try {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const resend = new Resend(resendKey);
        const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@MzanziHomes.co";
        const fromName = Deno.env.get("RESEND_FROM_NAME") || "MzanziHomes";
        const { data: landlordUser } = await supabase.auth.admin.getUserById(property.landlord_id);
        const to = landlordUser?.user?.email;
        if (to) {
          await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject: `New lead for ${where}`,
            html: `
              <h2>You have a new lead 🎉</h2>
              <p><strong>${tenantName}</strong> is interested in <strong>${where}</strong>.</p>
              <ul>
                <li>Email: ${user.email}</li>
                ${tenantPhone ? `<li>Phone: ${tenantPhone}</li>` : ""}
              </ul>
              ${message ? `<p>"${message}"</p>` : ""}
              <p>Reply to them directly — this lead came through your pay-per-listing plan.</p>
            `,
          });
        }
      }
    } catch (emailErr) {
      logStep("Email failed (non-fatal)", { error: (emailErr as Error).message });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logStep("ERROR", { message: (e as Error).message });
    return new Response(
      JSON.stringify({ success: false, error: (e as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReminderPayload {
  tenant_id: string;
  property_id: string;
  amount?: number;
  due_date?: string; // ISO
  message?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const authed = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false, detectSessionInUrl: false }, global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const resend = new Resend(RESEND_API_KEY);

    const payload: ReminderPayload = await req.json();
    const { tenant_id, property_id, amount, due_date, message } = payload || {};
    if (!tenant_id || !property_id) {
      return new Response(JSON.stringify({ error: "tenant_id and property_id are required" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Identify caller (landlord) from token
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(authHeader);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const landlordId = userData.user.id;

    // Verify relationship: landlord has tenancy or application with tenant for this property
    const { data: tenancy } = await admin
      .from("tenancies")
      .select("id")
      .eq("landlord_id", landlordId)
      .eq("tenant_id", tenant_id)
      .eq("property_id", property_id)
      .maybeSingle();
    if (!tenancy) {
      // fallback: accepted application
      const { data: app } = await admin
        .from("applications")
        .select("id,status")
        .eq("landlord_id", landlordId)
        .eq("tenant_id", tenant_id)
        .eq("property_id", property_id)
        .eq("status", "accepted")
        .maybeSingle();
      if (!app) {
        return new Response(JSON.stringify({ error: "Access denied for reminder" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }

    // Fetch tenant email/name
    const { data: tenantProfile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("user_id", tenant_id)
      .maybeSingle();
    const tenantName = tenantProfile?.display_name || "Tenant";

    // Get tenant email via auth admin
    const { data: tenantUser } = await admin.auth.admin.getUserById(tenant_id as any);
    const tenantEmail = tenantUser?.user?.email;

    // Fetch property details for context
    const { data: property } = await admin
      .from("properties")
      .select("title, location")
      .eq("id", property_id)
      .maybeSingle();

    const prettyAmount = typeof amount === "number" ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount) : undefined;
    const prettyDue = due_date ? new Date(due_date).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;

    // Create in-app notification (mark as high priority)
    await admin.rpc('create_notification', {
      _user_id: tenant_id,
      _message: `Payment reminder${property?.title ? `: ${property.title}` : ''}${prettyAmount ? ` • ${prettyAmount}` : ''}${prettyDue ? ` • Due ${prettyDue}` : ''}`,
      _link_url: '/tenant/payments',
      _type: 'payment_reminder',
      _metadata: { property_id, landlord_id: landlordId, amount, due_date, priority: 'high', severity: 'urgent' }
    });

    // Send email if we have a tenant email
    if (tenantEmail) {
      const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@swiftrent.co';
      const FROM_NAME = Deno.env.get('RESEND_FROM_NAME') || 'SwiftRent';
      const subject = `URGENT: SwiftRent Payment Reminder${property?.title ? ` • ${property.title}` : ''}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; padding:24px; background:#f8fafc;">
          <div style="background:#ffffff; padding:24px; border-radius:8px;">
            <h2 style="margin:0 0 12px; color:#b91c1c;">URGENT Payment Reminder</h2>
            <p style="margin:0 0 16px; color:#374151;">Hello ${tenantName},</p>
            <p style="margin:0 0 16px; color:#374151;">This is a friendly reminder regarding an outstanding payment${property?.title ? ` for <strong>${property.title}</strong>` : ''}.${prettyAmount ? ` The amount due is <strong>${prettyAmount}</strong>.` : ''}${prettyDue ? ` The due date is <strong>${prettyDue}</strong>.` : ''}</p>
            ${message ? `<p style="margin:0 0 16px; color:#374151;">Message from your landlord:<br/>${message}</p>` : ''}
            <div style="margin:24px 0;">
              <a href="${Deno.env.get('SUPABASE_URL')?.replace('/v1','')}/tenant/payments" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:600;">View Payments</a>
            </div>
            <p style="margin:16px 0 0; color:#6b7280; font-size:12px;">This email was sent by SwiftRent on behalf of your landlord.</p>
          </div>
        </div>
      `;
      await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [tenantEmail],
        subject,
        html,
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High'
        }
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error('send-payment-reminder error', e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});



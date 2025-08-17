import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface Payload {
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  slot_id: string;
  old_slot_id?: string;
  action?: 'booked' | 'cancelled' | 'updated' | 'completed';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { property_id, landlord_id, tenant_id, slot_id, old_slot_id, action = 'booked' } = (await req.json()) as Payload;

    // Fetch property
    const { data: property, error: propErr } = await admin
      .from("properties")
      .select("title, location")
      .eq("id", property_id)
      .maybeSingle();
    if (propErr) throw propErr;

    // Fetch slot
    const { data: slot, error: slotErr } = await admin
      .from("viewing_slots")
      .select("start_time, end_time")
      .eq("id", slot_id)
      .maybeSingle();
    if (slotErr) throw slotErr;

    // Fetch old slot for updates
    let oldSlot = null;
    if (action === 'updated' && old_slot_id) {
      const { data: oldSlotData } = await admin
        .from("viewing_slots")
        .select("start_time, end_time")
        .eq("id", old_slot_id)
        .maybeSingle();
      oldSlot = oldSlotData;
    }

    // Fetch profiles for display names
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", [landlord_id, tenant_id]);

    const landlordProfile = profiles?.find(p => p.user_id === landlord_id);
    const tenantProfile = profiles?.find(p => p.user_id === tenant_id);

    // Fetch user emails via Admin API
    const [{ data: landlord }, { data: tenant }] = await Promise.all([
      admin.auth.admin.getUserById(landlord_id),
      admin.auth.admin.getUserById(tenant_id),
    ]);

    const landlordEmail = landlord.user?.email;
    const tenantEmail = tenant.user?.email;

    const formatDateTime = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const when = slot?.start_time ? formatDateTime(slot.start_time) : "(time TBD)";
    const oldWhen = oldSlot?.start_time ? formatDateTime(oldSlot.start_time) : null;

    let subject = '';
    let htmlContent = '';
    const propertyTitle = property?.title ?? "Property";
    const tenantName = tenantProfile?.display_name ?? "Tenant";
    const landlordName = landlordProfile?.display_name ?? "Landlord";

    switch (action) {
      case 'booked':
        subject = `New Viewing Booked: ${propertyTitle}`;
        htmlContent = `
          <h2 style="color: #2563eb;">New Viewing Booked</h2>
          <p><strong>${tenantName}</strong> has booked a viewing for your property:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px;">${propertyTitle}</h3>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${property?.location ?? "N/A"}</p>
            <p style="margin: 4px 0;"><strong>Viewing Time:</strong> ${when}</p>
          </div>
          <p>Please ensure you're available for the viewing.</p>
        `;
        break;

      case 'cancelled':
        subject = `Viewing Cancelled: ${propertyTitle}`;
        htmlContent = `
          <h2 style="color: #dc2626;">Viewing Cancelled</h2>
          <p><strong>${tenantName}</strong> has cancelled their viewing for your property:</p>
          <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #dc2626;">
            <h3 style="margin: 0 0 8px;">${propertyTitle}</h3>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${property?.location ?? "N/A"}</p>
            <p style="margin: 4px 0;"><strong>Cancelled Time:</strong> ${when}</p>
          </div>
          <p>The viewing slot is now available for other potential tenants.</p>
        `;
        break;

      case 'updated':
        subject = `Viewing Rescheduled: ${propertyTitle}`;
        htmlContent = `
          <h2 style="color: #059669;">Viewing Rescheduled</h2>
          <p><strong>${tenantName}</strong> has rescheduled their viewing for your property:</p>
          <div style="background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #059669;">
            <h3 style="margin: 0 0 8px;">${propertyTitle}</h3>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${property?.location ?? "N/A"}</p>
            ${oldWhen ? `<p style="margin: 4px 0;"><strong>Previous Time:</strong> <span style="text-decoration: line-through;">${oldWhen}</span></p>` : ''}
            <p style="margin: 4px 0;"><strong>New Time:</strong> ${when}</p>
          </div>
          <p>Please update your calendar accordingly.</p>
        `;
        break;

      case 'completed':
        subject = `Viewing Completed: ${propertyTitle}`;
        htmlContent = `
          <h2 style="color: #16a34a;">Viewing Completed</h2>
          <p>The viewing for <strong>${propertyTitle}</strong> has been marked as completed by ${tenantName} or ${landlordName}.</p>
          <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #16a34a;">
            <p style="margin: 4px 0;"><strong>Completed Time:</strong> ${when}</p>
          </div>
          <p>You can now invite the tenant to apply from your dashboard.</p>
        `;
        break;
    }

    // Send email to landlord
    const sends: Promise<any>[] = [];
    if (landlordEmail) {
      sends.push(
        resend.emails.send({ 
          from: "SwiftRent <noreply@swiftrent.co.za>", 
          to: [landlordEmail], 
          subject, 
          html: htmlContent 
        })
      );
    }

    // Send confirmation to tenant for bookings
    if (tenantEmail && action === 'booked') {
      const tenantHtml = `
        <h2 style="color: #2563eb;">Viewing Confirmed</h2>
        <p>Hello ${tenantName},</p>
        <p>Your viewing has been confirmed for:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px;">${propertyTitle}</h3>
          <p style="margin: 4px 0;"><strong>Location:</strong> ${property?.location ?? "N/A"}</p>
          <p style="margin: 4px 0;"><strong>Viewing Time:</strong> ${when}</p>
        </div>
        <p>Please arrive on time. You can manage your booking from the property page.</p>
      `;
      sends.push(
        resend.emails.send({
          from: "SwiftRent <noreply@swiftrent.co.za>",
          to: [tenantEmail],
          subject: `Viewing Confirmed: ${propertyTitle}`,
          html: tenantHtml
        })
      );
    }

    await Promise.allSettled(sends);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("notify-viewing-booked error", error);
    return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

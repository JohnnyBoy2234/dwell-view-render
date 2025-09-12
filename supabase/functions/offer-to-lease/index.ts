// Offer → Lease Draft → (optional) Render + Send for Signature
// Converts an accepted offer into a lease draft and optionally sends for signature

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
};

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const Body = z.object({
  offerId: z.string().uuid(),
  autoSendForSignature: z.boolean().optional().default(true)
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerId, autoSendForSignature } = Body.parse(await req.json());

    console.log(`Converting offer ${offerId} to lease...`);

    // 1) Load offer
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .single();
    
    if (offerErr || !offer) {
      console.error("Offer not found:", offerErr);
      throw new Error("Offer not found");
    }

    if (offer.status !== 'accepted') {
      throw new Error("Only accepted offers can be converted to leases");
    }

    // Extract offer details
    const { listing_id, landlord_id, tenant_id, terms_json } = offer;
    const rent = terms_json?.rent;
    const deposit = terms_json?.deposit;
    const start = terms_json?.start;
    const end = terms_json?.end;
    const address = terms_json?.address;
    const landlord_name = terms_json?.landlord_name ?? "Landlord";
    const tenant_name = terms_json?.tenant_name ?? "Tenant";
    const tenant_id_no = terms_json?.tenant_id_no ?? null;
    const payment_day = terms_json?.payment_day ?? 1;
    const utilities_included = !!terms_json?.utilities_included;
    const notes = terms_json?.notes ?? "";

    if (!rent || !deposit || !start || !end || !address) {
      throw new Error("Offer missing required fields (rent/deposit/start/end/address)");
    }

    // 2) Create lease draft with mapped data
    const lease_data = {
      landlord: {
        name: landlord_name,
        id_number: terms_json?.landlord_id_no ?? "",
        company: terms_json?.landlord_company ?? "",
        email: terms_json?.landlord_email ?? "",
        phone: terms_json?.landlord_phone ?? "",
        address: terms_json?.landlord_address ?? ""
      },
      tenant: {
        name: tenant_name,
        id_number: tenant_id_no ?? "",
        email: terms_json?.tenant_email ?? "",
        phone: terms_json?.tenant_phone ?? "",
        current_address: terms_json?.tenant_address ?? "",
        occupants: terms_json?.occupants ?? []
      },
      property: {
        address: address,
        unit: terms_json?.unit ?? "",
        city: terms_json?.city ?? "",
        province: terms_json?.province ?? "",
        postal_code: terms_json?.postal_code ?? "",
        type: terms_json?.property_type ?? "apartment",
        parking: terms_json?.parking ?? "N/A"
      },
      term: {
        start_date: start,
        end_date: end,
        option_to_renew: terms_json?.option_to_renew ?? false,
        notice_period_days: terms_json?.notice_period_days ?? 30
      },
      rent: {
        monthly_rent: rent,
        due_day: payment_day,
        payment_method: terms_json?.payment_method ?? "EFT",
        late_fee_policy: {
          grace_days: terms_json?.grace_days ?? 5,
          late_fee_fixed: terms_json?.late_fee_fixed ?? 0,
          late_fee_percent: terms_json?.late_fee_percent ?? 0
        }
      },
      deposit: {
        amount: deposit,
        return_days: terms_json?.deposit_return_days ?? 7
      },
      utilities: {
        water: utilities_included ? "included" : "tenant",
        electricity: utilities_included ? "included" : "tenant",
        internet: utilities_included ? "included" : "tenant",
        other: terms_json?.utilities_other ?? ""
      },
      maintenance: {
        tenant_minor_repairs_cap: terms_json?.minor_repairs_cap ?? 1000,
        landlord_responsible: terms_json?.landlord_maintenance ?? []
      },
      access: {
        entry_notice_hours: terms_json?.entry_notice_hours ?? 24
      },
      governing_law: "South African law",
      attachments: {
        move_in_inspection_required: terms_json?.inspection_required ?? true,
        annexures: terms_json?.annexures ?? []
      },
      branding: {
        logo_url: "",
        primary_hex: "#0b67ff",
        secondary_hex: "#f8fafc",
        font_family: "Inter"
      }
    };

    const { data: lease, error: leaseErr } = await supabase
      .from("leases")
      .insert({
        property_id: listing_id,
        landlord_user_id: landlord_id,
        tenant_user_id: tenant_id,
        status: "DRAFT",
        lease_data,
        version: 1
      })
      .select("*")
      .single();

    if (leaseErr) {
      console.error("Error creating lease:", leaseErr);
      throw leaseErr;
    }

    console.log(`Created lease ${lease.id}`);

    // 3) Log workflow step
    await supabase.from("workflow_runs").insert({
      workflow_name: "lease_generation",
      entity_type: "lease",
      entity_id: lease.id,
      step: "created",
      meta: { offerId, autoSendForSignature }
    });

    // 4) Generate PDF
    let pdfUrl = null;
    try {
      const renderResponse = await supabase.functions.invoke('lease-render', {
        body: { leaseId: lease.id }
      });

      if (renderResponse.data?.pdfUrl) {
        pdfUrl = renderResponse.data.pdfUrl;
        await supabase.from("leases").update({ pdf_draft_url: pdfUrl }).eq("id", lease.id);
      }
    } catch (pdfError) {
      console.error("PDF generation failed, continuing without PDF:", pdfError);
    }

    // 5) Auto send for signatures if requested
    if (autoSendForSignature) {
      await sendForSignature(lease.id, {
        landlord_id,
        tenant_id,
        landlord_name,
        tenant_name
      });
    }

    // 6) Update offer status
    await supabase
      .from("offers")
      .update({ status: "completed" })
      .eq("id", offerId);

    return new Response(JSON.stringify({ 
      ok: true, 
      leaseId: lease.id, 
      pdfUrl,
      status: autoSendForSignature ? "PENDING_TENANT_SIGNATURE" : "DRAFT"
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error("Error in offer-to-lease:", e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e?.message ?? e) 
    }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper function to send lease for signature
async function sendForSignature(
  leaseId: string,
  ctx: { landlord_id: string; tenant_id: string; landlord_name: string; tenant_name: string }
) {
  console.log(`Sending lease ${leaseId} for signature`);

  // Create signature records
  const signaturePromises = [
    supabase.from("lease_signatures").insert({
      lease_id: leaseId,
      role: "LANDLORD",
      signer_user_id: ctx.landlord_id
    }),
    supabase.from("lease_signatures").insert({
      lease_id: leaseId,
      role: "TENANT", 
      signer_user_id: ctx.tenant_id
    })
  ];

  await Promise.all(signaturePromises);

  // Update lease status
  await supabase.from("leases").update({ 
    status: "PENDING_TENANT_SIGNATURE" 
  }).eq("id", leaseId);

  // Log workflow step
  await supabase.from("workflow_runs").insert({
    workflow_name: "lease_generation",
    entity_type: "lease",
    entity_id: leaseId,
    step: "sent_for_signature",
    meta: { recipients: [ctx.landlord_id, ctx.tenant_id] }
  });

  // TODO: Send notifications via your notification service
  // await notifyUser(ctx.landlord_id, "lease_sign_landlord", { leaseId });
  // await notifyUser(ctx.tenant_id, "lease_sign_tenant", { leaseId });

  console.log(`Lease ${leaseId} sent for signature successfully`);
}
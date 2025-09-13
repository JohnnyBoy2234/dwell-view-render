// Lease PDF Renderer
// Takes a lease ID and generates a professional PDF document

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
  leaseId: z.string().uuid()
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leaseId } = Body.parse(await req.json());

    console.log(`Rendering PDF for lease ${leaseId}`);

    // Load lease data
    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("*")
      .eq("id", leaseId)
      .single();

    if (leaseError || !lease) {
      console.error("Lease not found:", leaseError);
      throw new Error("Lease not found");
    }

    // Generate HTML from template
    const html = await generateLeaseHTML(lease);
    
    // For now, we'll create a simple text-based PDF placeholder
    // In production, you would use Puppeteer or a PDF service
    const pdfUrl = await generatePDF(html, leaseId);

    // Update lease with PDF URL
    await supabase.from("leases").update({ 
      pdf_draft_url: pdfUrl 
    }).eq("id", leaseId);

    // Log workflow step
    await supabase.from("workflow_runs").insert({
      workflow_name: "lease_generation",
      entity_type: "lease",
      entity_id: leaseId,
      step: "pdf_rendered",
      meta: { url: pdfUrl }
    });

    console.log(`PDF rendered for lease ${leaseId}: ${pdfUrl}`);

    return new Response(JSON.stringify({ 
      ok: true, 
      pdfUrl 
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    console.error("Error in lease-render:", e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(e?.message ?? e) 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateLeaseHTML(lease: any): Promise<string> {
  const data = lease.lease_data;
  const now = new Date();
  
  // Mask ID number for privacy
  const maskId = (id: string) => id ? id.replace(/\d(?=\d{4})/g, "*") : "";
  
  // Generate HTML from template
  const template = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SwiftRent Residential Lease Agreement</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size: 11pt; line-height: 1.4; }
    .header { border-bottom: 2px solid #0b67ff; padding-bottom: 10mm; margin-bottom: 10mm; }
    .brand { display:flex; align-items:center; gap:8px; }
    .logo { width: 20mm; height: 20mm; background:#0b67ff; border-radius:4mm; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; }
    h1 { font-size: 18pt; margin: 0 0 6mm; color: #0b67ff; }
    .section { margin-top: 8mm; }
    .info-grid { display:grid; grid-template-columns: 35mm 1fr; gap:4mm; margin-bottom:6mm; }
    .info-row { display: flex; margin-bottom: 3mm; }
    .info-label { width: 35mm; font-weight: bold; }
    .info-value { flex: 1; }
    .terms { margin: 8mm 0; }
    .term-item { margin: 4mm 0; }
    .signatures { margin-top: 16mm; display: flex; gap: 20mm; }
    .signature-box { flex: 1; }
    .signature-line { border-bottom: 1px solid #333; height: 20mm; margin-bottom: 4mm; }
    .small { font-size: 9pt; color: #666; }
    .footer { margin-top: 16mm; padding-top: 8mm; border-top: 1px solid #ddd; font-size: 9pt; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <div class="logo">SR</div>
      <div>
        <h1>SwiftRent Residential Lease Agreement</h1>
        <div class="small">Safe, direct, commission-free renting</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Property Details</h3>
    <div class="info-row">
      <div class="info-label">Address:</div>
      <div class="info-value">${data.property?.address || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Type:</div>
      <div class="info-value">${data.property?.type || 'Residential'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Parking:</div>
      <div class="info-value">${data.property?.parking || 'N/A'}</div>
    </div>
  </div>

  <div class="section">
    <h3>Lease Terms</h3>
    <div class="info-row">
      <div class="info-label">Start Date:</div>
      <div class="info-value">${data.term?.start_date || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">End Date:</div>
      <div class="info-value">${data.term?.end_date || 'N/A'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Monthly Rent:</div>
      <div class="info-value">R ${data.rent?.monthly_rent || 0}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Security Deposit:</div>
      <div class="info-value">R ${data.deposit?.amount || 0}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Payment Due:</div>
      <div class="info-value">Day ${data.rent?.due_day || 1} of each month</div>
    </div>
  </div>

  <div class="section">
    <h3>Parties</h3>
    <div class="info-row">
      <div class="info-label">Landlord:</div>
      <div class="info-value">${data.landlord?.name || 'N/A'} ${data.landlord?.company ? `(${data.landlord.company})` : ''}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Tenant:</div>
      <div class="info-value">${data.tenant?.name || 'N/A'} (ID: ${maskId(data.tenant?.id_number || '')})</div>
    </div>
  </div>

  <div class="section">
    <h3>Utilities & Services</h3>
    <div class="info-row">
      <div class="info-label">Water:</div>
      <div class="info-value">${data.utilities?.water || 'Tenant responsible'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Electricity:</div>
      <div class="info-value">${data.utilities?.electricity || 'Tenant responsible'}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Internet:</div>
      <div class="info-value">${data.utilities?.internet || 'Tenant responsible'}</div>
    </div>
  </div>

  <div class="section">
    <h3>Standard Terms</h3>
    <div class="terms">
      <div class="term-item">1. The premises shall be used solely as a private residence.</div>
      <div class="term-item">2. Rent is due monthly in advance by the ${data.rent?.due_day || 1}th of each month.</div>
      <div class="term-item">3. Late payment may incur fees as agreed between parties.</div>
      <div class="term-item">4. Security deposit will be refunded within ${data.deposit?.return_days || 7} days after lease termination, subject to property condition.</div>
      <div class="term-item">5. Tenant must provide ${data.access?.entry_notice_hours || 24} hours notice for landlord property access except in emergencies.</div>
      <div class="term-item">6. This lease is governed by South African law and the Consumer Protection Act.</div>
      <div class="term-item">7. All maintenance requests should be submitted through the SwiftRent platform.</div>
    </div>
  </div>

  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div><strong>Landlord:</strong> ${data.landlord?.name || 'N/A'}</div>
      <div class="small">Date: _______________</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div><strong>Tenant:</strong> ${data.tenant?.name || 'N/A'}</div>
      <div class="small">Date: _______________</div>
    </div>
  </div>

  <div class="footer">
    <div>Lease ID: ${lease.id} • Generated: ${now.toISOString().slice(0,16).replace("T"," ")} • SwiftRent Platform</div>
    <div class="small">This lease was generated and managed through SwiftRent - Safe, direct, commission-free renting</div>
  </div>
</body>
</html>`;

  return template;
}

// Placeholder PDF generation - in production use Puppeteer or PDF service
async function generatePDF(html: string, leaseId: string): Promise<string> {
  // For demo purposes, we'll just return a placeholder URL
  // In production, you would:
  // 1. Use Puppeteer to convert HTML to PDF
  // 2. Upload the PDF to Supabase Storage
  // 3. Return the public/signed URL
  
  const placeholderUrl = `https://files.swiftrent.co.za/leases/${leaseId}.pdf`;
  
  console.log(`PDF generated (placeholder): ${placeholderUrl}`);
  
  return placeholderUrl;
}
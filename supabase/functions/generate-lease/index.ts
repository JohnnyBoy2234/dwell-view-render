import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to safely get string values and prevent errors
const safeString = (value: any, fallback = 'N/A'): string => {
    if (value === null || value === undefined) {
        return fallback;
    }
    return String(value);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { tenancyId } = await req.json();
    if (!tenancyId) throw new Error("Missing tenancyId");

    // Fetch all related data for the lease
    const { data: tenancy, error: tenancyError } = await supabaseClient
      .from("tenancies")
      .select(`
        *,
        properties (title, location, description),
        tenant_profile:profiles!tenant_id (display_name),
        landlord_profile:profiles!landlord_id (display_name)
      `)
      .eq("id", tenancyId)
      .single();

    if (tenancyError) throw tenancyError;
    if (!tenancy || !tenancy.landlord_profile || !tenancy.tenant_profile || !tenancy.properties) {
        throw new Error("Incomplete tenancy data found. Could not generate lease.");
    }
    
    // --- PDF Generation Logic ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;

    let y = height - 50;
    const drawText = (text: string, size = fontSize, isBold = false) => {
      page.drawText(text, {
        x: 50,
        y,
        font: isBold ? boldFont : font,
        size,
        color: rgb(0, 0, 0),
      });
      y -= size * 1.5;
    };

    drawText("RESIDENTIAL LEASE AGREEMENT", 18, true);
    y -= 20;

    drawText("This Lease Agreement is entered into on " + new Date().toLocaleDateString(), fontSize);
    y -= 10;
    
    drawText("PARTIES", fontSize, true);
    drawText(`Landlord: ${safeString(tenancy.landlord_profile.display_name)}`);
    drawText(`Tenant: ${safeString(tenancy.tenant_profile.display_name)}`);
    y -= 10;

    drawText("PROPERTY", fontSize, true);
    drawText(`Property: ${safeString(tenancy.properties.title)}`);
    drawText(`Address: ${safeString(tenancy.properties.location)}`);
    drawText(`Description: ${safeString(tenancy.properties.description)}`);
    y -= 10;

    drawText("TERMS", fontSize, true);
    drawText(`Lease Start Date: ${new Date(safeString(tenancy.start_date, new Date().toISOString())).toLocaleDateString()}`);
    drawText(`Lease End Date: ${new Date(safeString(tenancy.end_date, new Date().toISOString())).toLocaleDateString()}`);
    drawText(`Monthly Rent: $${safeString(tenancy.monthly_rent)}`);
    drawText(`Security Deposit: $${safeString(tenancy.security_deposit)}`);
    y -= 20;

    // Terms and conditions
    drawText("TERMS AND CONDITIONS", fontSize, true);
    
    const terms = [
      "1. The tenant agrees to pay the monthly rent on or before the 1st day of each month.",
      "2. The security deposit will be returned within 30 days of lease termination,",
      "   subject to property condition.",
      "3. The tenant is responsible for maintaining the property in good condition.",
      "4. No subletting is allowed without written consent from the landlord.",
      "5. The landlord has the right to inspect the property with 24-hour notice.",
      "6. Any damages beyond normal wear and tear will be deducted from the",
      "   security deposit.",
      "7. This lease agreement is governed by local housing laws and regulations."
    ];

    terms.forEach((term) => {
      if (y < 100) {
        const newPage = pdfDoc.addPage();
        y = newPage.getHeight() - 50;
      }
      drawText(term, 10);
    });

    y -= 20;

    // Custom Clauses
    const customClauses = Array.isArray(tenancy.custom_clauses) ? tenancy.custom_clauses : [];
    if (customClauses.length > 0) {
      if (y < 120) {
        const newPage = pdfDoc.addPage();
        y = newPage.getHeight() - 50;
      }
      drawText("CUSTOM CLAUSES", fontSize, true);
      customClauses.forEach((clause: any, index: number) => {
        const title = safeString(clause?.title ?? clause?.name ?? `Clause ${index + 1}`);
        const description = safeString(
          clause?.description ?? clause?.text ?? clause?.body ?? clause?.content ?? String(clause)
        );
        drawText(`${index + 1}. ${title}`, 12, true);
        description.split('\n').forEach((line: string) => {
          if (y < 80) {
            const nextPage = pdfDoc.addPage();
            y = nextPage.getHeight() - 50;
          }
          drawText(line, 10);
        });
        y -= 10;
      });
      y -= 20;
    }

    // Signature areas
    if (y < 100) {
      const newPage = pdfDoc.addPage();
      y = newPage.getHeight() - 50;
    }
    
    drawText("SIGNATURES", fontSize, true);
    y -= 10;
    drawText("Landlord Signature: ___________________________ Date: ___________");
    y -= 10;
    drawText("Tenant Signature: _____________________________ Date: ___________");
    y -= 20;

    drawText("This document becomes legally binding upon the digital signature of both parties.", 10);
    
    const pdfBytes = await pdfDoc.save();
    const filePath = `${tenancy.landlord_id}/${tenancyId}/lease-${Date.now()}.pdf`;

    // Upload PDF to Supabase Storage
    const { error: uploadError } = await supabaseClient.storage
      .from("lease-documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Update the tenancy record with the PDF PATH and set status to awaiting tenant signature
    const { error: updateError } = await supabaseClient
      .from("tenancies")
      .update({ 
        lease_document_path: filePath,
        lease_status: 'awaiting_tenant_signature'
      })
      .eq("id", tenancyId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true, 
      documentPath: filePath 
    }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      },
      status: 200,
    });

  } catch (error) {
    console.error("Lease Generation Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        "Content-Type": "application/json",
        ...corsHeaders 
      },
      status: 500,
    });
  }
});
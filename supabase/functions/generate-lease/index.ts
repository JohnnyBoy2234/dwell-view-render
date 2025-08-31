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

    const { tenancyId, wizard } = await req.json();
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
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;

    let y = height - 60;

    // Try to load SwiftRent logo from Storage (branding/swiftrent-logo.png) or external URL env
    let logoImage: any = null;
    try {
      const logoUrl = Deno.env.get("SWIFTRENT_LOGO_URL");
      if (logoUrl) {
        const resp = await fetch(logoUrl);
        if (resp.ok) {
          const buf = new Uint8Array(await resp.arrayBuffer());
          logoImage = await pdfDoc.embedPng(buf).catch(async () => await pdfDoc.embedJpg(buf));
        }
      } else {
        const { data: logoFile } = await supabaseClient.storage.from("branding").download("swiftrent-logo.png");
        if (logoFile) {
          const buf = new Uint8Array(await logoFile.arrayBuffer());
          logoImage = await pdfDoc.embedPng(buf).catch(async () => await pdfDoc.embedJpg(buf));
        }
      }
    } catch (_e) {
      // fallback to text-only header
    }

    const drawHeader = () => {
      const top = height - 30;
      // If logo available, draw it small with name; else draw brand mark square + name (like navbar)
      if (logoImage) {
        const logoW = 80;
        const aspect = logoImage.height / logoImage.width;
        const logoH = logoW * aspect;
        page.drawImage(logoImage, { x: 50, y: top - logoH + 10, width: logoW, height: logoH });
        page.drawText("SwiftRent", { x: 50 + logoW + 10, y: top - 8, font: boldFont, size: 16, color: rgb(0,0,0) });
      } else {
        // Brand square
        page.drawRectangle({ x: 50, y: top - 18, width: 18, height: 18, color: rgb(0.06, 0.47, 0.74) });
        page.drawText("SwiftRent", { x: 50 + 18 + 10, y: top - 8, font: boldFont, size: 16, color: rgb(0,0,0) });
      }
    };

    const drawFooter = (pageNumber: number) => {
      const footerY = 30;
      // subtle divider line
      page.drawRectangle({ x: 40, y: footerY + 22, width: width - 80, height: 0.5, color: rgb(0.85,0.85,0.85) });
      page.drawText("SwiftRent • From Listing to Lease, Made Easy", { x: 50, y: footerY, font, size: 9, color: rgb(0.2,0.2,0.2) });
      const pageNumText = `Page ${pageNumber}`;
      const textWidthVal = font.widthOfTextAtSize(pageNumText, 9);
      page.drawText(pageNumText, { x: width - 50 - textWidthVal, y: footerY, font, size: 9, color: rgb(0.2,0.2,0.2) });
      // Initials anchors on every page
      page.drawText("Initials __________ SWIFTRENT_INIT_LANDLORD    __________ SWIFTRENT_INIT_TENANT_1", { x: 50, y: footerY + 8, font, size: 9, color: rgb(0.2,0.2,0.2) });
    };

    const drawText = (text: string, size = fontSize, isBold = false) => {
      if (y < 80) {
        // footer for old page
        drawFooter(pdfDoc.getPageCount());
        // new page
        page = pdfDoc.addPage();
        ({ width, height } = page.getSize());
        y = height - 60;
        drawHeader();
      }
      page.drawText(text, { x: 50, y, font: isBold ? boldFont : font, size, color: rgb(0, 0, 0) });
      y -= size * 1.5;
    };

    // Page header
    drawHeader();

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

    // Terms and conditions (from wizard clauses if provided)
    drawText("TERMS AND CONDITIONS", fontSize, true);
    const incomingClauses = Array.isArray(wizard?.clauses) ? wizard.clauses : [];
    if (incomingClauses.length > 0) {
      incomingClauses.forEach((cl: any, idx: number) => {
        const title = safeString(cl.title, `Clause ${idx + 1}`);
        const body = safeString(cl.body);
        drawText(`${idx + 1}. ${title}`, 12, true);
        body.split('\n').forEach((line: string) => drawText(line, 10));
        y -= 6;
      });
    } else {
      const terms = [
        "1. The tenant agrees to pay the monthly rent on or before the 1st day of each month.",
        "2. The security deposit will be returned within 30 days of lease termination, subject to property condition.",
        "3. The tenant is responsible for maintaining the property in good condition.",
        "4. No subletting is allowed without written consent from the landlord.",
        "5. The landlord has the right to inspect the property with 24-hour notice.",
        "6. Any damages beyond normal wear and tear will be deducted from the security deposit.",
        "7. This lease agreement is governed by local housing laws and regulations."
      ];
      terms.forEach((term) => { drawText(term, 10); });
    }

    y -= 20;

    // Custom Clauses
    const customClauses = Array.isArray(tenancy.custom_clauses) ? tenancy.custom_clauses : [];
    if (customClauses.length > 0) {
      drawText("CUSTOM CLAUSES", fontSize, true);
      customClauses.forEach((clause: any, index: number) => {
        const title = safeString(clause?.title ?? clause?.name ?? `Clause ${index + 1}`);
        const description = safeString(
          clause?.description ?? clause?.text ?? clause?.body ?? clause?.content ?? String(clause)
        );
        drawText(`${index + 1}. ${title}`, 12, true);
        description.split('\n').forEach((line: string) => { drawText(line, 10); });
        y -= 10;
      });
      y -= 20;
    }

    // Signature areas
    if (y < 100) { page = pdfDoc.addPage(); ({ width, height } = page.getSize()); y = height - 60; drawHeader(); }
    
    drawText("SIGNATURES", fontSize, true);
    y -= 10;
    // Include DocuSign anchor strings to lock tabs
    drawText("Landlord Signature: ___________________________ SWIFTRENT_SIGN_LANDLORD    Date: ___________");
    y -= 10;
    drawText("Tenant 1 Signature: __________________________ SWIFTRENT_SIGN_TENANT_1    Date: ___________");
    y -= 20;

    drawText("This document becomes legally binding upon the digital signature of both parties.", 10);
    
    const pdfBytes = await pdfDoc.save();
    // SwiftRent filename convention
    const today = new Date().toISOString().slice(0,10);
    const address = safeString(tenancy.properties.location, tenancy.properties.title).replace(/[^a-z0-9]/gi, '_');
    const fileName = `SwiftRent_Lease_${address}_${today}_Draft.pdf`;
    const filePath = `${tenancy.landlord_id}/${tenancyId}/${fileName}`;

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

    // Draw footer on last page
    drawFooter(pdfDoc.getPageCount());

    return new Response(JSON.stringify({ success: true, documentPath: filePath }), {
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
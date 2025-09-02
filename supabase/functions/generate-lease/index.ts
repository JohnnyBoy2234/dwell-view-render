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

    const drawHeader = (targetPage = page) => {
      const top = height - 30;
      // If logo available, draw it small with name; else draw brand mark square + name (like navbar)
      // Mask any existing header content
      targetPage.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: rgb(1,1,1) });
      if (logoImage) {
        const logoW = 80;
        const aspect = logoImage.height / logoImage.width;
        const logoH = logoW * aspect;
        targetPage.drawImage(logoImage, { x: 50, y: top - logoH + 10, width: logoW, height: logoH });
        targetPage.drawText("SwiftRent", { x: 50 + logoW + 10, y: top - 8, font: boldFont, size: 16, color: rgb(0,0,0) });
      } else {
        // Brand square
        targetPage.drawRectangle({ x: 50, y: top - 18, width: 18, height: 18, color: rgb(0.06, 0.47, 0.74) });
        targetPage.drawText("SwiftRent", { x: 50 + 18 + 10, y: top - 8, font: boldFont, size: 16, color: rgb(0,0,0) });
      }
    };

    const drawFooter = (pageNumber: number, targetPage = page) => {
      const footerY = 30;
      // Mask any existing footer content
      targetPage.drawRectangle({ x: 0, y: 0, width, height: 60, color: rgb(1,1,1) });
      // subtle divider line
      targetPage.drawRectangle({ x: 40, y: footerY + 22, width: width - 80, height: 0.5, color: rgb(0.85,0.85,0.85) });
      targetPage.drawText("SwiftRent • From Listing to Lease, Made Easy", { x: 50, y: footerY, font, size: 9, color: rgb(0.2,0.2,0.2) });
      const pageNumText = `Page ${pageNumber}`;
      const textWidthVal = font.widthOfTextAtSize(pageNumText, 9);
      targetPage.drawText(pageNumText, { x: width - 50 - textWidthVal, y: footerY, font, size: 9, color: rgb(0.2,0.2,0.2) });
      // Initials anchors on every page
      targetPage.drawText("Initials __________ SWIFTRENT_INIT_LANDLORD    __________ SWIFTRENT_INIT_TENANT_1", { x: 50, y: footerY + 8, font, size: 9, color: rgb(0.2,0.2,0.2) });
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

    // If a source PDF is configured, import it and decorate; else render fallback template
    let importedSource = false;
    try {
      const srcUrl = Deno.env.get("LEASE_SOURCE_URL");
      if (srcUrl) {
        const res = await fetch(srcUrl);
        if (res.ok) {
          const srcBytes = new Uint8Array(await res.arrayBuffer());
          const srcPdf = await PDFDocument.load(srcBytes);
          const srcPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
          pdfDoc.removePage(0);
          srcPages.forEach((p) => pdfDoc.addPage(p));
          const pages = pdfDoc.getPages();
          pages.forEach((p, idx) => {
            const { width: w, height: h } = p.getSize();
            width = w; height = h;
            drawHeader(p);
            drawFooter(idx + 1, p);
          });
          importedSource = true;
        }
      } else {
        // Fallback: try to read from Storage path lease-documents/templates/source-template.pdf
        const { data: srcFile } = await supabaseClient.storage
          .from("lease-documents")
          .download("templates/source-template.pdf");
        if (srcFile) {
          const buf = new Uint8Array(await srcFile.arrayBuffer());
          const srcPdf = await PDFDocument.load(buf);
          const srcPages = await pdfDoc.copyPages(srcPdf, srcPdf.getPageIndices());
          pdfDoc.removePage(0);
          srcPages.forEach((p) => pdfDoc.addPage(p));
          const pages = pdfDoc.getPages();
          pages.forEach((p, idx) => {
            const { width: w, height: h } = p.getSize();
            width = w; height = h;
            drawHeader(p);
            drawFooter(idx + 1, p);
          });
          importedSource = true;
        }
      }
    } catch (_e) {
      importedSource = false;
    }

    if (!importedSource) {
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
    }

    // Append a Key Terms page summarizing merge fields
    let summaryPage = pdfDoc.addPage();
    page = summaryPage; ({ width, height } = page.getSize()); y = height - 60;
    drawHeader();
    drawText("SCHEDULE A – KEY TERMS", 14, true);
    drawText(`Premises Address: ${safeString(tenancy.properties.location)}`);
    drawText(`Landlord: ${safeString(tenancy.landlord_profile.display_name)}`);
    drawText(`Tenant: ${safeString(tenancy.tenant_profile.display_name)}`);
    drawText(`Monthly Rent: R${safeString(tenancy.monthly_rent)}`);
    drawText(`Deposit: R${safeString(tenancy.security_deposit)}`);
    drawText(`Lease Term: ${new Date(safeString(tenancy.start_date)).toLocaleDateString()} to ${new Date(safeString(tenancy.end_date)).toLocaleDateString()}`);
    drawFooter(pdfDoc.getPageCount());
    
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

    // Update the tenancy record with the PDF PATH and set status to awaiting tenant signature (do not mark tenancy active)
    const { error: updateError } = await supabaseClient
      .from("tenancies")
      .update({ 
        lease_document_path: filePath,
        lease_status: 'awaiting_tenant_signature',
        status: 'pending'
      })
      .eq("id", tenancyId);

    if (updateError) throw updateError;

    // Draw footer on last page if not yet drawn
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount()-1];
    page = lastPage; ({ width, height } = page.getSize());
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
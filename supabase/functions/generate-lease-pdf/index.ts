import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch contract data
    const { data: contract, error } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) throw error;

    console.log(`Generating PDF for contract ${contractId}`);

    // Generate PDF document
    const pdfBuffer = await generatePDFDocument(contract);
    
    // Upload PDF to storage
    const fileName = `${contractId}/lease_${contract.version}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lease-documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lease-documents')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Generate PDF hash for integrity verification
    const pdfHash = await generatePDFHash(pdfBuffer);

    // Update contract with PDF URL and hash
    const { error: updateError } = await supabase
      .from('lease_contracts')
      .update({
        pdf_url: pdfUrl,
        pdf_hash: pdfHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) throw updateError;

    // Add audit entry
    await supabase.rpc('add_lease_audit_entry', {
      contract_id: contractId,
      action: 'pdf_generated',
      actor_id: contract.landlord_id,
      details: { 
        pdf_url: pdfUrl,
        pdf_hash: pdfHash,
        version: contract.version
      }
    });

    console.log(`PDF generated successfully for contract ${contractId}`);

    return new Response(JSON.stringify({
      success: true,
      pdfUrl: pdfUrl,
      pdfHash: pdfHash,
      contractId: contractId
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to generate PDF" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

async function generatePDFDocument(contract: any): Promise<Uint8Array> {
	const data = contract.contract_data || {};
	const today = new Date();
	const doc = await PDFDocument.create();

	// Document metadata
	doc.setTitle(`Lease Agreement • ${contract.title || contract.id}`);
	doc.setAuthor("SwiftRent");
	doc.setCreator("SwiftRent Lease Generator");
	doc.setProducer("pdf-lib");
	doc.setCreationDate(today);
	doc.setModificationDate(today);

	const fontBody = await doc.embedFont(StandardFonts.Helvetica);
	const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

	const margin = 48;
	const lineGap = 6;
	const pageWidth = 612; // Letter width
	const pageHeight = 792; // Letter height

	let page = doc.addPage([pageWidth, pageHeight]);
	let y = pageHeight - margin;
	const pages: any[] = [page];

	const colors = {
		text: rgb(0, 0, 0),
		muted: rgb(0.4, 0.4, 0.4),
		brand: rgb(0.12, 0.45, 0.96),
		rule: rgb(0.85, 0.85, 0.85),
		invisible: rgb(1, 1, 1), // for DocuSign anchor text
	};

	const sizes = { h1: 18, h2: 13, h3: 11, body: 10, small: 9 } as const;

	const drawBrandHeader = (p: any, firstPage: boolean) => {
		p.drawRectangle({ x: 0, y: pageHeight - 28, width: pageWidth, height: 28, color: colors.brand });
		const brandTitle = "SwiftRent Residential Lease Agreement";
		p.drawText(brandTitle, { x: margin, y: pageHeight - 19, size: 11, font: fontBold, color: rgb(1,1,1) });
		if (!firstPage) {
			const meta = `Contract ${contract.id}`;
			const w = fontBody.widthOfTextAtSize(meta, sizes.small);
			p.drawText(meta, { x: pageWidth - margin - w, y: pageHeight - 20, size: sizes.small, font: fontBody, color: rgb(1,1,1) });
		}
	};

	const drawFooter = (p: any, pageNumber: number) => {
		const text = `Page ${pageNumber}`;
		p.drawText(text, {
			x: pageWidth - margin - fontBody.widthOfTextAtSize(text, sizes.small),
			y: margin - 12,
			size: sizes.small,
			font: fontBody,
			color: colors.muted,
		});
		// Optional initials anchors near footer
		p.drawText("SWIFTRENT_INIT_LANDLORD", { x: margin, y: margin - 2, size: 8, font: fontBody, color: colors.invisible });
		p.drawText("SWIFTRENT_INIT_TENANT_1", { x: margin + 160, y: margin - 2, size: 8, font: fontBody, color: colors.invisible });
	};

	const drawRule = () => {
		page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: colors.rule });
		y -= 14;
	};

	const newPage = () => {
		drawFooter(page, pages.length);
		page = doc.addPage([pageWidth, pageHeight]);
		pages.push(page);
		y = pageHeight - margin;
		drawBrandHeader(page, false);
		y -= 32;
	};

	const ensureSpace = (needed: number) => {
		if (y - needed < margin + 40) newPage();
	};

	const drawHeading = (text: string) => {
		ensureSpace(sizes.h2 + 10);
		page.drawText(text.toUpperCase(), { x: margin, y, size: sizes.h2, font: fontBold, color: colors.text });
		y -= sizes.h2 + 6;
	};

	const drawKeyValue = (label: string, value: string) => {
		const lh = sizes.body + lineGap;
		ensureSpace(lh);
		page.drawText(label, { x: margin, y, size: sizes.body, font: fontBold, color: colors.text });
		const labelWidth = fontBold.widthOfTextAtSize(label, sizes.body) + 6;
		page.drawText(value || 'Not specified', { x: margin + labelWidth, y, size: sizes.body, font: fontBody, color: colors.text });
		y -= lh;
	};

	const drawParagraph = (text: string, opts?: { bullet?: string }) => {
		if (!text) return;
		const maxWidth = pageWidth - margin * 2;
		const words = text.split(/\s+/);
		let line = '';
		const bullet = opts?.bullet ? `${opts.bullet} ` : '';
		const bulletWidth = opts?.bullet ? fontBody.widthOfTextAtSize(bullet, sizes.body) : 0;
		const startX = margin + bulletWidth;
		while (words.length) {
			const candidate = (line ? `${line} ` : '') + words[0];
			const w = fontBody.widthOfTextAtSize(candidate, sizes.body);
			if (w > (maxWidth - bulletWidth)) {
				ensureSpace(sizes.body + lineGap);
				if (opts?.bullet) {
					page.drawText(bullet, { x: margin, y, size: sizes.body, font: fontBody, color: colors.text });
				}
				page.drawText(line, { x: startX, y, size: sizes.body, font: fontBody, color: colors.text });
				y -= sizes.body + lineGap;
				line = '';
			} else {
				line = candidate;
				words.shift();
			}
		}
		if (line) {
			ensureSpace(sizes.body + lineGap);
			if (opts?.bullet) {
				page.drawText(bullet, { x: margin, y, size: sizes.body, font: fontBody, color: colors.text });
			}
			page.drawText(line, { x: startX, y, size: sizes.body, font: fontBody, color: colors.text });
			y -= sizes.body + lineGap;
		}
	};

	// First page header
	drawBrandHeader(page, true);
	y -= 32;

	// Title & meta
	page.drawText(data.title || 'Lease Agreement', { x: margin, y, size: sizes.h1, font: fontBold, color: colors.text });
	y -= sizes.h1 + 6;
	const gen = today.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
	page.drawText(`Contract ID: ${contract.id}`, { x: margin, y, size: sizes.small, font: fontBody, color: colors.muted });
	const genText = `Generated: ${gen}`;
	page.drawText(genText, { x: pageWidth - margin - fontBody.widthOfTextAtSize(genText, sizes.small), y, size: sizes.small, font: fontBody, color: colors.muted });
	y -= sizes.small + 10;
	drawRule();

	// Property Information
	drawHeading('Property Information');
	drawKeyValue('Property Address:', data.propertyAddress || '');
	drawKeyValue('Property Type:', data.propertyType || '');
	if (data.propertyDescription) drawParagraph(data.propertyDescription);
	drawRule();

	// Parties
	drawHeading('Parties');
	drawKeyValue('Landlord:', data.landlordName || '');
	drawKeyValue('Landlord Email:', data.landlordEmail || '');
	if (data.landlordPhone) drawKeyValue('Landlord Phone:', data.landlordPhone);
	if (data.landlordAddress) drawKeyValue('Landlord Address:', data.landlordAddress);
	drawKeyValue('Tenant:', data.tenantName || 'To be filled');
	if (data.tenantEmail) drawKeyValue('Tenant Email:', data.tenantEmail);
	if (data.tenantPhone) drawKeyValue('Tenant Phone:', data.tenantPhone);
	if (data.tenantAddress) drawKeyValue('Tenant Address:', data.tenantAddress);
	drawRule();

	// Lease Terms
	drawHeading('Lease Terms');
	drawKeyValue('Lease Start Date:', data.leaseStartDate || '');
	drawKeyValue('Lease End Date:', data.leaseEndDate || '');
	drawKeyValue('Monthly Rent:', `${data.rentCurrency || 'ZAR'} ${Number(data.rentAmount || 0).toLocaleString('en-ZA')}`);
	drawKeyValue('Payment Schedule:', (data.rentPaymentFrequency || 'Monthly').toString());
	const dueDay = data.rentDueDay || 1;
	const suffix = getOrdinalSuffix(dueDay);
	drawKeyValue('Rent Due Day:', `${dueDay}${suffix} of each month`);
	drawRule();

	// Deposits and Fees
	drawHeading('Deposits and Fees');
	drawKeyValue('Security Deposit:', `${data.rentCurrency || 'ZAR'} ${Number(data.securityDeposit || 0).toLocaleString('en-ZA')}`);
	if (data.petDeposit) drawKeyValue('Pet Deposit:', `${data.rentCurrency || 'ZAR'} ${Number(data.petDeposit).toLocaleString('en-ZA')}`);
	if (data.keyDeposit) drawKeyValue('Key Deposit:', `${data.rentCurrency || 'ZAR'} ${Number(data.keyDeposit).toLocaleString('en-ZA')}`);
	drawRule();

	// Property Rules
	drawHeading('Property Rules');
	drawKeyValue('Pets Allowed:', data.petsAllowed ? 'Yes' : 'No');
	drawKeyValue('Smoking Allowed:', data.smokingAllowed ? 'Yes' : 'No');
	drawKeyValue('Guests Allowed:', data.guestsAllowed ? 'Yes' : 'No');
	drawKeyValue('Subletting Allowed:', data.sublettingAllowed ? 'Yes' : 'No');
	drawRule();

	// Utilities and Services
	drawHeading('Utilities and Services');
	drawParagraph(Array.isArray(data.utilitiesIncluded) && data.utilitiesIncluded.length ? `Included: ${data.utilitiesIncluded.join(', ')}` : 'Included: None specified');
	if (Array.isArray(data.utilitiesExcluded) && data.utilitiesExcluded.length) {
		drawParagraph(`Excluded: ${data.utilitiesExcluded.join(', ')}`);
	}
	drawRule();

	// Additional Clauses
	if (Array.isArray(data.additionalClauses) && data.additionalClauses.length > 0) {
		drawHeading('Additional Terms and Conditions');
		data.additionalClauses.forEach((cl: any, i: number) => {
			drawParagraph(`${i + 1}. ${cl.title || 'Clause'}`, { bullet: '•' });
			if (cl.content) drawParagraph(cl.content);
			y -= 4;
		});
		drawRule();
	}

	// Legal and Compliance
	drawHeading('Legal and Compliance');
	const jurisdiction = data.jurisdiction || 'South Africa';
	drawParagraph(`Governing Jurisdiction: ${jurisdiction}`);
	drawParagraph(`This lease agreement is governed by the laws of ${jurisdiction} and any disputes shall be resolved in the courts of said jurisdiction.`);

	// Signatures
	ensureSpace(130);
	drawHeading('Signatures');

	const sigLine = (label: string, anchor: string) => {
		const lineWidth = 240;
		const lineY = y - 10;
		page.drawLine({ start: { x: margin, y: lineY }, end: { x: margin + lineWidth, y: lineY }, thickness: 1, color: colors.text });
		page.drawText(label, { x: margin, y: lineY - 14, size: sizes.small, font: fontBody, color: colors.muted });
		// Invisible DocuSign anchor text near the line
		page.drawText(anchor, { x: margin + lineWidth / 2 - 40, y: lineY + 4, size: 8, font: fontBody, color: colors.invisible });
		y -= 42;
	};

	sigLine('Landlord Signature', 'SWIFTRENT_SIGN_LANDLORD');
	sigLine('Tenant Signature', 'SWIFTRENT_SIGN_TENANT_1');

	// Footer on last page
	drawFooter(page, pages.length);

	const pdfBytes = await doc.save();
	return pdfBytes;
}

function generateLeaseHTML(contract: any): string {
  const data = contract.contract_data;
  const today = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lease Agreement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 20px; }
        .signature-area { margin-top: 50px; display: flex; justify-content: space-between; }
        .signature-box { width: 200px; border-top: 1px solid #000; padding-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>RESIDENTIAL LEASE AGREEMENT</h1>
        <p>Contract ID: ${contract.id}</p>
        <p>Generated: ${today}</p>
      </div>
      
      <div class="section">
        <h2>PROPERTY INFORMATION</h2>
        <p><strong>Property Address:</strong> ${data.propertyAddress || 'Not specified'}</p>
        <p><strong>Property Type:</strong> ${data.propertyType || 'Not specified'}</p>
        <p><strong>Description:</strong> ${data.propertyDescription || 'Not specified'}</p>
      </div>
      
      <div class="section">
        <h2>PARTIES</h2>
        <p><strong>Landlord:</strong> ${data.landlordName || 'Not specified'}</p>
        <p><strong>Landlord Address:</strong> ${data.landlordAddress || 'Not specified'}</p>
        <p><strong>Landlord Email:</strong> ${data.landlordEmail || 'Not specified'}</p>
        <p><strong>Landlord Phone:</strong> ${data.landlordPhone || 'Not specified'}</p>
        
        <p><strong>Tenant:</strong> ${data.tenantName || 'To be filled'}</p>
        <p><strong>Tenant Address:</strong> ${data.tenantAddress || 'To be filled'}</p>
        <p><strong>Tenant Email:</strong> ${data.tenantEmail || 'To be filled'}</p>
        <p><strong>Tenant Phone:</strong> ${data.tenantPhone || 'To be filled'}</p>
      </div>
      
      <div class="section">
        <h2>LEASE TERMS</h2>
        <p><strong>Lease Start Date:</strong> ${data.leaseStartDate || 'Not specified'}</p>
        <p><strong>Lease End Date:</strong> ${data.leaseEndDate || 'Not specified'}</p>
        <p><strong>Monthly Rent:</strong> ${data.rentCurrency || 'ZAR'} ${data.rentAmount?.toLocaleString() || 'Not specified'}</p>
        <p><strong>Payment Schedule:</strong> ${data.rentPaymentFrequency || 'Monthly'}</p>
        <p><strong>Rent Due Day:</strong> ${data.rentDueDay || 1}${getOrdinalSuffix(data.rentDueDay || 1)} of each month</p>
      </div>
      
      <div class="section">
        <h2>DEPOSITS AND FEES</h2>
        <p><strong>Security Deposit:</strong> ${data.rentCurrency || 'ZAR'} ${data.securityDeposit?.toLocaleString() || '0'}</p>
        <p><strong>Pet Deposit:</strong> ${data.rentCurrency || 'ZAR'} ${data.petDeposit?.toLocaleString() || '0'}</p>
        <p><strong>Key Deposit:</strong> ${data.rentCurrency || 'ZAR'} ${data.keyDeposit?.toLocaleString() || '0'}</p>
      </div>
      
      <div class="section">
        <h2>PROPERTY RULES</h2>
        <p><strong>Pets Allowed:</strong> ${data.petsAllowed ? 'Yes' : 'No'}</p>
        <p><strong>Smoking Allowed:</strong> ${data.smokingAllowed ? 'Yes' : 'No'}</p>
        <p><strong>Guests Allowed:</strong> ${data.guestsAllowed ? 'Yes' : 'No'}</p>
        <p><strong>Subletting Allowed:</strong> ${data.sublettingAllowed ? 'Yes' : 'No'}</p>
      </div>
      
      <div class="section">
        <h2>UTILITIES AND SERVICES</h2>
        <p><strong>Utilities Included:</strong> ${data.utilitiesIncluded?.join(', ') || 'None specified'}</p>
        <p><strong>Utilities Excluded:</strong> ${data.utilitiesExcluded?.join(', ') || 'None specified'}</p>
      </div>
      
      ${data.additionalClauses && data.additionalClauses.length > 0 ? `
      <div class="section">
        <h2>ADDITIONAL TERMS AND CONDITIONS</h2>
        ${data.additionalClauses.map((clause: any, index: number) => `
          <div>
            <h3>${index + 1}. ${clause.title}</h3>
            <p>${clause.content}</p>
          </div>
        `).join('')}
      </div>
      ` : ''}
      
      <div class="section">
        <h2>LEGAL AND COMPLIANCE</h2>
        <p><strong>Governing Jurisdiction:</strong> ${data.jurisdiction || 'South Africa'}</p>
        <p>This lease agreement is governed by the laws of ${data.jurisdiction || 'South Africa'} and any disputes shall be resolved in the courts of said jurisdiction.</p>
      </div>
      
      <div class="signature-area">
        <div>
          <div class="signature-box">
            <p>Landlord Signature</p>
          </div>
          <p>Date: _______________</p>
        </div>
        <div>
          <div class="signature-box">
            <p>Tenant Signature</p>
          </div>
          <p>Date: _______________</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function createSimplePDF(contract: any): string {
  const data = contract.contract_data;
  const today = new Date().toLocaleDateString();
  
  return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 2000
>>
stream
BT
/F1 16 Tf
50 750 Td
(RESIDENTIAL LEASE AGREEMENT) Tj
0 -20 Td
/F1 12 Tf
(Contract ID: ${contract.id}) Tj
0 -15 Td
(Generated: ${today}) Tj

0 -30 Td
/F1 14 Tf
(PROPERTY INFORMATION) Tj
0 -20 Td
/F1 10 Tf
(Property Address: ${data.propertyAddress || 'Not specified'}) Tj
0 -15 Td
(Monthly Rent: ${data.rentCurrency || 'ZAR'} ${data.rentAmount?.toLocaleString() || 'Not specified'}) Tj
0 -15 Td
(Lease Start: ${data.leaseStartDate || 'Not specified'}) Tj
0 -15 Td
(Lease End: ${data.leaseEndDate || 'Not specified'}) Tj

0 -30 Td
/F1 14 Tf
(LANDLORD INFORMATION) Tj
0 -20 Td
/F1 10 Tf
(Name: ${data.landlordName || 'Not specified'}) Tj
0 -15 Td
(Email: ${data.landlordEmail || 'Not specified'}) Tj

0 -30 Td
/F1 14 Tf
(TENANT INFORMATION) Tj
0 -20 Td
/F1 10 Tf
(Name: ${data.tenantName || 'To be filled'}) Tj
0 -15 Td
(Email: ${data.tenantEmail || 'To be filled'}) Tj

ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000002326 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
2404
%%EOF`;
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

async function generatePDFHash(pdfBuffer: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
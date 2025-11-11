import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { contractId } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    // Fetch contract data
    const { data: contract, error } = await supabase.from('lease_contracts').select('*').eq('id', contractId).single();
    if (error) throw error;
    console.log(`Generating PDF for contract ${contractId}`);
    // Generate PDF document (pass origin for logo fallback)
    const requestOrigin = req.headers.get('origin') || undefined;
    const pdfBuffer = await generatePDFDocument(contract, requestOrigin);
    // Upload PDF to storage
    const fileName = `${contractId}/lease_${contract.version}_${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('lease-documents').upload(fileName, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }
    // Get public URL
    const { data: urlData } = supabase.storage.from('lease-documents').getPublicUrl(fileName);
    const pdfUrl = urlData.publicUrl;
    // Generate PDF hash for integrity verification
    const pdfHash = await generatePDFHash(pdfBuffer);
    // Update contract with PDF URL and hash
    const { error: updateError } = await supabase.from('lease_contracts').update({
      pdf_url: pdfUrl,
      pdf_hash: pdfHash,
      updated_at: new Date().toISOString()
    }).eq('id', contractId);
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
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to generate PDF"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
async function generatePDFDocument(contract, requestOrigin) {
  // --- Constants & Config --- 
  const data = contract.contract_data || {};
  const today = new Date();
  const margin = 48;
  const lineGap = 8;
  const pageWidth = 612;
  const pageHeight = 792;
  const labelColumnWidth = 100;
  const contentIndent = 6;
  const headerHeight = 60;
  const colors = {
    text: rgb(0, 0, 0),
    muted: rgb(0.4, 0.4, 0.4),
    brand: rgb(0.12, 0.45, 0.96),
    rule: rgb(0.85, 0.85, 0.85),
    invisible: rgb(1, 1, 1)
  };
  const sizes = {
    h1: 18,
    h2: 13,
    h3: 11,
    body: 10,
    small: 9
  };
  // --- Document Setup --- 
  const doc = await PDFDocument.create();
  doc.setTitle(`Lease Agreement • ${contract.title || contract.id}`);
  doc.setAuthor("RentLekker");
  doc.setCreator("RentLekker Lease Generator");
  doc.setProducer("pdf-lib");
  doc.setCreationDate(today);
  doc.setModificationDate(today);
  const fontBody = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  // --- Logo Embedding --- 
  let brandLogo = null;
  async function tryEmbedLogo() {
    try {
      // Prefer app-hosted favicon2.png in public root, else BRAND_LOGO_URL, else old favicon path
      const logoUrl = (requestOrigin ? `${requestOrigin}/favicon2.png` : undefined)
        || Deno.env.get("BRAND_LOGO_URL")
        || (requestOrigin ? `${requestOrigin}/favicon_io/favicon-32x32.png` : undefined);
      if (!logoUrl) return;
      const res = await fetch(logoUrl, {
        cache: "no-store"
      });
      const bytes = new Uint8Array(await res.arrayBuffer());
      try {
        brandLogo = await doc.embedPng(bytes);
      } catch  {
        brandLogo = await doc.embedJpg(bytes);
      }
    } catch  {
    // fail silently, logo stays null 
    }
  }
  await tryEmbedLogo();
  // --- State --- 
  const pages = [];
  let page = doc.addPage([
    pageWidth,
    pageHeight
  ]);
  let y = pageHeight - margin - headerHeight - 8;
  pages.push(page);
  // --- Drawing Helpers --- 
  const ensureSpace = (needed)=>{
    if (y - needed < margin + 40) newPage();
  };
  const newPage = ()=>{
    drawFooter(page, pages.length);
    page = doc.addPage([
      pageWidth,
      pageHeight
    ]);
    pages.push(page);
    drawBrandHeader(page);
    y = pageHeight - margin - headerHeight - 8;
  };
  function drawBrandHeader(p) {
    const bandY = pageHeight - headerHeight;
    const steps = 36;
    const start = {
      r: 0.12,
      g: 0.45,
      b: 0.96
    };
    const end = {
      r: 0.16,
      g: 0.73,
      b: 0.52
    };
    const stepWidth = pageWidth / steps;
    for(let i = 0; i < steps; i++){
      const t = i / Math.max(steps - 1, 1);
      const r = start.r + (end.r - start.r) * t;
      const g = start.g + (end.g - start.g) * t;
      const b = start.b + (end.b - start.b) * t;
      p.drawRectangle({
        x: i * stepWidth,
        y: bandY,
        width: stepWidth + 0.5,
        height: headerHeight,
        color: rgb(r, g, b)
      });
    }
    if (brandLogo) {
      const logoHeight = 24;
      const logoWidth = brandLogo.width / brandLogo.height * logoHeight;
      const lx = pageWidth - margin - logoWidth;
      const ly = bandY + (headerHeight - logoHeight) / 2;
      p.drawImage(brandLogo, {
        x: lx,
        y: ly,
        width: logoWidth,
        height: logoHeight
      });
    }
  }
  function drawFooter(p, pageNumber) {
    const text = `Page ${pageNumber}`;
    p.drawText(text, {
      x: pageWidth - margin - fontBody.widthOfTextAtSize(text, sizes.small),
      y: margin - 12,
      size: sizes.small,
      font: fontBody,
      color: colors.muted
    });
    // Invisible initials anchors
    p.drawText("RentLekker_INIT_LANDLORD", {
      x: margin + 60,
      y: margin - 2,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
    p.drawText("RentLekker_INIT_TENANT_1", {
      x: margin + 220,
      y: margin - 2,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
  }
  async function embedSignatureFromDataUrl(dataUrl) {
    try {
      if (!dataUrl) return null;
      if (dataUrl.startsWith('data:')) {
        const base64Part = dataUrl.split(',')[1] || '';
        const bytes = Uint8Array.from(atob(base64Part), c => c.charCodeAt(0));
        try {
          return await doc.embedPng(bytes);
        } catch {
          return await doc.embedJpg(bytes);
        }
      }
      // Fallback: fetch remote URL
      const res = await fetch(dataUrl, { cache: 'no-store' });
      const bytes = new Uint8Array(await res.arrayBuffer());
      try {
        return await doc.embedPng(bytes);
      } catch {
        return await doc.embedJpg(bytes);
      }
    } catch {
      return null;
    }
  }
  // --- Formatting Helpers ---
  const toText = (v)=>v === undefined || v === null ? "" : String(v);
  const formatMoney = (amount, currency)=>{
    if (amount === undefined || amount === null) return "";
    const n = Number(amount);
    if (Number.isNaN(n)) return "";
    return `${currency || "ZAR"} ${n.toLocaleString()}`;
  };
  const formatDateStr = (value)=>{
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return toText(value);
    return dt.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "2-digit"
    });
  };
  // --- Text Helpers --- 
  function drawParagraph(text) {
    ensureSpace(sizes.body + lineGap);
    if (text) {
      page.drawText(text, {
        x: margin,
        y,
        size: sizes.body,
        font: fontBody,
        color: colors.text
      });
    }
    y -= sizes.body + lineGap;
  }
  function drawFormRow(label, value) {
    ensureSpace(sizes.body + lineGap);
    const labelText = label ? `${label}` : "";
    const valueText = value ? String(value) : "________________________";
    // Draw label in bold
    page.drawText(labelText, {
      x: margin,
      y,
      size: sizes.body,
      font: fontBold,
      color: colors.text
    });
    // Draw colon
    const labelWidth = fontBold.widthOfTextAtSize(labelText, sizes.body);
    const colonWidth = fontBody.widthOfTextAtSize(":", sizes.body);
    const colonX = margin + labelWidth + 4;
    page.drawText(":", {
      x: colonX,
      y,
      size: sizes.body,
      font: fontBody,
      color: colors.text
    });
    // Draw value or underline filler
    const valueX = colonX + colonWidth + 6;
    page.drawText(valueText, {
      x: valueX,
      y,
      size: sizes.body,
      font: fontBody,
      color: colors.text
    });
    y -= sizes.body + lineGap;
  }
  function drawRule() {
    ensureSpace(16);
    page.drawLine({
      start: {
        x: margin,
        y
      },
      end: {
        x: pageWidth - margin,
        y
      },
      thickness: 1,
      color: colors.rule
    });
    y -= lineGap;
  }
  function drawSectionTitle(number, text) {
    ensureSpace(sizes.h2 + lineGap);
    const titleText = number ? `${number}. ${text}` : text;
    page.drawText(titleText, {
      x: margin,
      y,
      size: sizes.h2,
      font: fontBold,
      color: colors.text
    });
    y -= sizes.h2 + lineGap;
  }
  function drawNumberedText(number, text) {
    ensureSpace(sizes.body + lineGap);
    page.drawText(`${number}. ${text}`, {
      x: margin,
      y,
      size: sizes.body,
      font: fontBody,
      color: colors.text
    });
    y -= sizes.body + lineGap;
  }
  // --- Section Rendering --- 
  function renderAgreementIntro() {
    page.drawText("AGREEMENT OF LEASE", {
      x: margin,
      y,
      size: sizes.h1,
      font: fontBold,
      color: colors.text
    });
    y -= sizes.h1 + 2;
    drawParagraph("");
    drawParagraph("Made and entered into by and between:");
    drawParagraph("“Landlord”");
    drawFormRow("Full Names:", toText(data.landlordName || data.landlordFullName));
    drawFormRow("Identity Number:", toText(data.landlordIdNumber || data.landlordId));
    drawFormRow("Email Address:", toText(data.landlordEmail));
    drawFormRow("Physical Address:", toText(data.landlordAddress));
    drawParagraph("AND");
    drawParagraph("(“Tenant”)");
    drawFormRow("Full Names", toText(data.tenantName || data.tenantFullName));
    drawFormRow("Identity Number:", toText(data.tenantIdNumber || data.tenantId));
    drawFormRow("Email Address:", toText(data.tenantEmail));
    drawFormRow("Physical Address:", toText(data.tenantAddress));
    drawParagraph("in respect of:");
    drawFormRow("Street Address:", toText(data.propertyAddress));
    drawFormRow("Garage Number:", toText(data.garageNumber));
    drawFormRow("Parking Bay Number:", toText(data.bayNumber));
    drawParagraph('together with the use of an undivided share in any common property (“the Property”).');
    drawRule();
    drawParagraph("");
  }
  // --- Use the helpers to render all sections --- 
  function renderInterpretation() {
    drawSectionTitle('1.', 'Interpretation');
    drawNumberedText('1.1.', 'The headings of clauses are for reference purposes only.');
    drawNumberedText('1.2.', 'References to notices, statements, and other communications by or from the Landlord include notices by or from the Landlord’s appointed Agency.');
    drawNumberedText('1.3.', 'Expressions in the singular also indicate the plural, and the other way round.');
    drawNumberedText('1.4.', 'Words and phrases indicating natural persons also refer to juristic persons, and the other way round, and pronouns of any gender include the pronouns of the other gender.');
    drawNumberedText('1.5.', 'Any provision of this Agreement placing a restraint, prohibition, or restriction on the Tenant must be interpreted to include the implied term that the Tenant must ensure that everybody occupying or entering the Property also complies with them, including the family, guests and domestic worker or other employees of the Tenant.');
    drawNumberedText('1.6.', 'The provisions of this Agreement shall be deemed severable, and the unenforceability of any one of the provisions shall not affect the enforceability of other provisions. In the event that a provision is found to be unenforceable, the parties shall substitute that provision with an enforceable provision that preserves the original intent and position of the parties.');
    drawRule();
    drawParagraph('');
  }
  function renderRecital() {
    drawSectionTitle('2.', 'Recital');
    drawNumberedText('2.1.', 'The Landlord hereby lets, and the Tenant takes in hire the Property on the terms and conditions contained herein, and that the below Annexures shall form an integral part of this Agreement as if incorporated into the body thereof:');
    drawNumberedText('2.1.1.', 'Ingoing and Outgoing Inspection lists.');
    drawNumberedText('2.1.2.', 'Conduct Rules (if applicable).');
    drawNumberedText('2.1.3.', 'Immovable Property Condition Report.');
    drawNumberedText('2.1.4.', 'Fixtures and Fittings List.');
    drawRule();
    drawParagraph('');
  }
  function renderComsumer() {
    drawSectionTitle('3.', 'Consumer Protection Act 68 of 2008 (CPA)');
    drawNumberedText('3.1.', 'The Tenant’s attention is drawn to the following provisions of the CPA:');
    drawNumberedText('3.1.1.', 'The CPA will not apply to lease agreements entered into between juristic persons, regardless of their turnover or asset value.');
    drawNumberedText('3.1.2.', 'Section 14 of the CPA provides that the Tenant may cancel this Agreement on 20 business days’ notice, subject to the Landlord being entitled to a reasonable cancellation penalty. Section 14 only applies to fixed term agreements.');
    drawNumberedText('3.1.3.', 'Certain terms and conditions have been printed in bold font to ensure that the Tenant specifically takes note of these provisions which may:');
    drawNumberedText('3.1.4.', 'Limit the liability of the Landlord or other party.');
    drawNumberedText('3.1.5.', 'Constitute an assumption of risk by the Tenant.');
    drawNumberedText('3.1.6.', 'Impose an obligation on the Tenant to indemnify the Landlord or other person.');
    drawNumberedText('3.1.7.', 'Be an acknowledgement of a fact by the Tenant.');
    drawNumberedText('3.1.8.', 'In terms of section 16 of the CPA, if this Agreement was signed by the Tenant as a result of Direct Marketing, the Tenant will be entitled to cancel this Agreement on written notice to the Landlord without reason or penalty within 5 business days of signing the Agreement.');
    drawNumberedText('3.1.9.', 'The Tenant warrants that this Agreement was not entered into as a result of any Direct Marketing and that the Landlord enters into this Agreement relying upon such warranty.');
    drawRule();
    drawParagraph('');
  }
  function renderRental() {
    drawSectionTitle('4.', 'Rental and Payments');
    drawNumberedText('4.1.', `The monthly rental (“Rent” or “Rental”) payable by the Tenant to the Landlord for the  Property is ${formatMoney(data.rentAmount, data.rentCurrency) || '________________'} per month`);
    drawNumberedText('4.2.', 'All Rental payments shall be made monthly in advance before the seventh (7TH) day of each and every month, free from any deductions or set off for any reason whatsoever, directly into the Landlord’s bank account reflected below.');
    drawFormRow('Bank:', data.bankName);
    drawFormRow('Branch Code:', data.branchCode);
    drawFormRow('Branch Name:', data.branchName);
    drawFormRow('Account Number:', data.accountNumber);
    drawFormRow('Reference:', data.paymentReference);
    drawNumberedText('4.3.', 'Should the Agreement be renewed or extended, the Tenant agrees to a Rental escalation of __ % per annum, or any other amount as may be agreed on between the parties.');
    drawNumberedText('4.4.', `The Tenant agrees to pay a deposit of ${data.deposit}`);
    ensureSpace(sizes.body + lineGap);
    page.drawText('R ', {
      x: margin,
      y,
      size: sizes.body,
      font: fontBody,
      color: colors.text
    });
    page.drawLine({
      start: {
        x: margin + 12,
        y: y - 2
      },
      end: {
        x: pageWidth - margin,
        y: y - 2
      },
      thickness: 0.8,
      color: colors.rule
    });
    y -= sizes.body + lineGap;
    // TODO: add the deposit
    drawParagraph(`before ${formatDateStr(data.depositDate)}`);
    drawParagraph('to the Landlord, which may be appropriated by the Landlord against any amount(s) which may be outstanding at any time in terms of this Agreement and/or any other liability of whatsoever nature for which the Tenant is responsible to the Landlord, including damages, and which amount may be retained by the Landlord throughout the duration of this Agreement and until final determination of any such amounts due by the Tenant.  The Tenant shall not be entitled to set off against the deposit any rent or any other amount payable. The deposit will be kept in an interest-bearing trust account and the deposit amount plus accrued interest will be refunded to the Tenant upon termination of this Agreement, less bank charges and other administrative costs, and further less any amounts deductible in terms of this Agreement.');
    drawNumberedText('4.5.', 'The amounts payable by the Tenant before the above deposit date are as follows:');
    const col1X = margin;
    const col2X = margin + 300;
    const rowH = 18;
    ensureSpace(rowH * 8);
    page.drawText('ITEM', {
      x: col1X,
      y,
      size: sizes.body,
      font: fontBold,
      color: colors.text
    });
    page.drawText('AMOUNT', {
      x: col2X,
      y,
      size: sizes.body,
      font: fontBold,
      color: colors.text
    });
    y -= rowH;
    const items = [
      'Admin fee (incl VAT)',
      'Application fee (incl VAT)',
      "First month’s rent",
      'Damages deposit ( _____ months rental)',
      'Other (specify):',
      'TOTAL'
    ];
    for (const it of items){
      page.drawText(it, {
        x: col1X,
        y,
        size: sizes.body,
        font: fontBody,
        color: colors.text
      });
      page.drawLine({
        start: {
          x: col2X,
          y: y - 2
        },
        end: {
          x: pageWidth - margin,
          y: y - 2
        },
        thickness: 0.8,
        color: colors.rule
      });
      y -= rowH;
    }
    drawNumberedText('4.6.', 'Should the Rent increase, the Tenant agrees to increase the deposit proportionately. Further, The Tenant agrees to restore and top up the deposit within 3 business days of being requested to do so whenever required in terms of this Agreement.');
    drawNumberedText('4.7.', 'Should the Tenant attempt to set off the deposit against any payments due, including the final month’s Rental, this shall be deemed as an attempt to vacate the Property and avoid the payment of Rent, in which event the Tenant agrees to the Landlord taking steps to have the Tenant’s goods attached and removed from the Property as security for such payments.');
    drawNumberedText('4.8.', 'The Tenant agrees to pay interest on all overdue amounts at the rate of two percent (2%) above the prime overdraft rate (percent, per annum) charged by leading financial institutions, calculated from the due dates of such amounts until payment. The Tenant will further be liable to pay the Landlord a penalty admin fee of R500.00 (excl VAT) for any payments made after the due date.');
    drawNumberedText('4.9.', 'Should any amounts payable by the Landlord increase, the Landlord will be entitled to increase the Rental pro rata.');
    drawNumberedText('4.10.', 'Should the Tenant fail to effect timeous and proper payment of any of the amounts above, it will be construed a material breach of this Agreement. Should any supplier or service provider terminate a service due to the Tenant’s non-payment, the Tenant will be liable for any reconnection or reinstatement fees applicable.');
    drawNumberedText('4.11.', 'It is hereby specifically recorded that the above rental amount payable by the tenant is exclusive of Municipal charges. The Tenants shall be responsible for 90% of the monthly municipal account which amount the tenants shall be required to pay within 2 (two) calendar weeks from presentation to them by the Landlord.');
    drawRule();
    drawParagraph("");
  }
  function renderDuration() {
    drawSectionTitle('5.', 'Duration of Lease');
    drawNumberedText('5.1.', `This Arrement shall conmence on ${formatDateStr(data.leaseStartDate)} and shall thereafter continue and endure for a period of ${toText(data.leaseMonths) || '_____'} months and terminate at 12:00 midday on ${formatDateStr(data.leaseEndDate) || '________________'} (hereinafter referred to as "the Initial Period").`);
    drawNumberedText('5.2.', 'The Tenants shall be entitled to, subject to reasonable negotiations and written consent by the Landlord, renew this Lease for a further period that is still to be determined (hereinafter referred to as "the Renewal Period ") on the same terms and conditions as in this Lease contained (save in respect of the rental as hereinafter set out), provided they shall have complied faithfully and regularly with each and every condition and obligation imposed on it in terms of this Lease and provided further that they shall have given to the Landlord at least 3 (Three) calender months notice in writing prior to the expiry of the main period of the Lease of their intention to renew.');
    drawNumberedText('5.3.', 'Either party shall be entitled to, upon material breach of this lease, terminate this Lease prior to the expiry of the main period or any subsequent renewal period by providing the other party with at least 2 (two) calendar months’ notice, in writing.');
    drawRule();
    drawParagraph("");
  }
  function renderTermination() {
    drawSectionTitle('6.', 'Termination');
    drawNumberedText('6.1.', 'The Landlord will provide the Tenant with written notice reminding him of the termination of the Agreement no earlier than 80 and no less than 40 business days before the end date. The notice will also advise the Tenant whether the Landlord intends to renew the Agreement and the notice will advise of any changes should the Agreement be renewed.');
    drawNumberedText('6.2.', 'After receipt of a notice as per the above, the Tenant will have 10 business days to:');
    drawNumberedText('6.2.1.', 'Accept the terms proposed in the notice. Such new terms and conditions proposed pertaining to the renewal will only be effective once reduced to writing in a renewal addendum and signed by both the Landlord and the Tenant.');
    drawNumberedText('6.2.2.', 'Elect that the Agreement terminates at the end of the initial period as agreed. However, should the Tenant not advise of such election timeously, the Agreement will continue on a month-to-month basis on the same terms and conditions as contained herein, subject thereto that any renewal period proposed in any notice will not apply and either party will have the right to terminate the Agreement by giving one calendar month written notice to the other. In such event it is specifically recorded that the CPA will no longer apply.');
    drawNumberedText('6.3.', 'Should the Landlord and Tenant not renew or extend the Agreement and should the Landlord not provide the Tenant with any notice as envisaged directly above, the Agreement will continue on a month-to-month basis on the same terms and conditions.');
    drawNumberedText('6.4.', 'The Tenant agrees to vacate the Property timeously upon termination of this Agreement.');
    drawRule();
    drawParagraph("");
  }
  function renderTBDeath() {
    drawSectionTitle('7.', 'Termination by Death or Insolvency');
    drawNumberedText('7.1.', 'This Agreement will not terminate with the death of either the Landlord or the Tenant. The executor of the deceased Tenant’s estate will have the option, depending upon the circumstances of the estate, either to:');
    drawNumberedText('7.1.1.', 'abide by the contract for the remainder period of the Agreement (the successor or successors of the Tenant assuming his rights and obligations) or');
    drawNumberedText('7.1.2.', 'to cancel this Agreement by giving the Landlord one month’s written notice of termination, such notice to be given not more than one month after the death of the Tenant.');
    drawNumberedText('7.2.', 'The insolvency of either the Landlord or the Tenant will not terminate this Agreement. However, the trustee of the Tenant’s insolvent estate will have the option to terminate this Agreement by giving the Landlord written notice. If the trustee does not within three months of his appointment as trustee notify the Landlord that he wants to continue with the Agreement on behalf of the estate, he will be deemed to have terminated the Agreement at the end of the three months.');
    drawRule();
    drawParagraph("");
  }
  function renderUse() {
    drawSectionTitle('8.', 'Use and Nuisance');
    drawNumberedText('8.1.', 'The Property shall be used for residential purposes only by the Tenant and his bona fide guests.');
    drawNumberedText('8.2.', 'The Tenant shall not permit anything to be done or stored in or about the Property which may be or become an annoyance or nuisance to neighbours or which may damage the Property or prejudice or vitiate the insurance policies in respect of the Property or increase the rate of premium(s) payable in respect of such policies and any increase in the premium by reason of the act or neglect of the Tenant shall be borne by the Tenant in addition to the Rental.');
    drawNumberedText('8.3.', 'The Tenant specifically undertakes to return the Property in the same order and condition as when they received it. This specifically includes, but is not limited to, the garden, swimming pool, exterior walls, doors, and garage.');
    drawNumberedText('8.4.', 'The Landlord shall keep the Property insured against risk of damage by fire. The Tenant agrees to take out insurance for his household items at his own election and at his own cost.');
    drawNumberedText('8.5.', 'The Landlord shall not under any circumstances be liable to the Tenant, his family or any other person entering in or upon the Property for any death, injury, loss or damage suffered in or about the Property, irrespective of whether it was caused by fire, storm, riot, civil commotion, theft, robbery, accident, or any other cause whatsoever, and the Tenant hereby indemnifies the Landlord and holds harmless the Landlord in respect of any such claim.');
    drawRule();
    drawParagraph("");
  }
  function renderBreachByTenant() {
    drawSectionTitle('9.', 'Breach by the Tenant');
    drawNumberedText('9.1.', 'The Landlord will be entitled to, at his sole discretion and without prejudice to any other rights in law, either demand specific performance and/or to cancel this Agreement with immediate effect and/or in addition to either option claim damages, should the Tenant:');
    drawNumberedText('9.1.1.', 'Fail to make any payment on or before the due date.');
    drawNumberedText('9.1.2.', 'Breach the Agreement and remain in breach of the Agreement for 7 calendar days after dispatch of a notice to remedy breach.');
    drawNumberedText('9.2.', 'Should section 14 of the CPA not apply and should the Tenant be in breach of any provision of this Agreement on two or more occasions during any 12-month period, the Landlord may elect to cancel this Agreement with immediate effect and claim possession of the Property. This is an additional remedy without prejudice or exclusion to any other remedy available to the Landlord in terms of this Agreement.');
    drawRule();
    drawParagraph("");
  }
  function renderBreachByLandlord() {
    drawSectionTitle('10.', 'Breach by the Landlord');
    drawNumberedText('10.1.', 'Should the Landlord commit a material breach of this Agreement, the Tenant may:');
    drawNumberedText('10.1.1.', 'Apply to court to recover damages suffered.');
    drawNumberedText('10.1.2.', 'Demand specific performance.');
    drawNumberedText('10.2.', 'The Tenant may cancel this Agreement without penalty if the Landlord does not remedy the material breach within 20 business days of receiving a notice to remedy breach.');
    drawRule();
    drawParagraph("");
  }
  function renderCancellationByTenant() {
    drawSectionTitle('11.', 'Cancellation by the Tenant Before Termination of the Agreement');
    drawNumberedText('11.1.', 'The Tenant is entitled to cancel this Agreement on 20 business days’ written notice if the CPA applies to this Agreement. In such event the Landlord will be entitled to a reasonable cancellation penalty.');
    drawNumberedText('11.2.', 'The Tenant agrees that such reasonable cancellation shall include at least:');
    drawNumberedText('11.2.1.', 'An amount equal to three months Rental, notwithstanding how far in advance or when the cancellation notice is provided.');
    drawNumberedText('11.2.2.', 'R1 500.00 plus VAT for advertisement costs, which the Tenant agrees is reasonable and necessary.');
    drawNumberedText('11.3.', 'In the event that the CPA does not apply, the Tenant is entitled to cancel this Agreement on 2 months\' notice and will be liable to the Landlord for the associated cost of replacing the Tenant which includes but is not limited to advertising costs, administrative expenses, Agent’s fees etc.');
    drawRule();
    drawParagraph("");
  }
  function renderCancellationByLandlord() {
    drawSectionTitle('12.', 'Cancellation by the Landlord');
    drawNumberedText('12.1.', 'Should the Landlord or body corporate become aware that the Tenant is conducting any illegal or criminal activity from the Property or is in contravention of any law or regulation, the Landlord may cancel this Agreement with immediate effect and the Tenant will have to vacate the Property immediately and at most within 24 hours from dispatch of the notice.');
    drawNumberedText('12.2.', 'The Landlord may cancel this Agreement if he becomes aware that the Tenant has provided incorrect information at any stage, including the application process. The Tenant warrants that all information provided is true and correct.');
    drawRule();
    drawParagraph("");
  }
  function renderConsequencesOfCancellation() {
    drawSectionTitle('13.', 'Consequences of Election to Cancel');
    drawNumberedText('13.1.', 'If the Landlord cancels the Agreement, the Tenant agrees to vacate the Property immediately and the Landlord will be entitled to retake possession thereof and may take any legal action to evict the Tenant and other occupiers.');
    drawNumberedText('13.2.', 'Should the Tenant be in default and dispute the Landlord’s right to cancel, the Tenant agrees to continue paying Rent and all amounts in terms of this Agreement as if the Agreement is still in full force and effect. Acceptance of any payments by the Landlord under these circumstances will not be construed as waiver of any right and will not prejudice any other rights that the Landlord may have. Should the matter be resolved in the Landlord’s favour, the Landlord will be entitled to retain the amounts paid, alternatively, will be entitled to the outstanding amounts, as damages for holding over.');
    drawRule();
    drawParagraph("");
  }
  function renderInspectionAndAccess() {
    drawSectionTitle('14.', 'Inspection and Access');
    drawNumberedText('14.1.', 'The parties or their representatives will hold a joint ingoing inspection, in terms of section 5(3) of the Rental Housing Act of 1999, prior to the Tenant taking occupation of the Property. an ingoing inspection list will be annexed hereto and initialled by all parties. Should the Tenant fail to attend the inspection the Property will be deemed to be in good condition.');
    drawNumberedText('14.2.', 'The Tenant shall advise the Landlord in writing within 7 (SEVEN) calendar days of commencement of the Agreement of the details of any defects in or about the Property and if such notice is not given by the Tenant, then the Tenant shall be deemed to have accepted the Property as being complete and free from defects. Any recordal of a defect in writing shall not constitute an acknowledgement or undertaking by the Landlord to have the defect repaired.');
    drawNumberedText('14.3.', 'An outgoing inspection will be attended to by the parties upon termination of this Agreement. The Tenant agrees to have the Property and the carpets professionally cleaned at his own costs prior to such inspection.');
    drawNumberedText('14.4.', 'The Landlord, either personally or through nominated representatives, shall have the right to inspect and to enter the Property at all reasonable times and after reasonable notice to the Tenant for the purpose of ensuring that the Tenant is complying with his obligations in terms of the Agreement.');
    drawNumberedText('14.5.', 'During the duration of the Agreement, the Landlord shall be entitled to bring any prospective purchasers of the Property to inspect the Property and the Tenant undertakes and agrees to assist the Landlord in this regard and not to do anything which will interfere with the sale of the Property during such period. The Tenant further agrees to “for sale”, “sold” and “to let” signs being put up for display at the Property.');
    drawNumberedText('14.6.', 'The Tenant agrees to allow the Landlord access to the Property on reasonable notice to attend to any repairs or alterations necessary for the safety or improvement of the Property.');
    drawRule();
    drawParagraph("");
  }
  function renderMaintenance() {
    drawSectionTitle('15.', 'Maintenance');
    drawNumberedText('15.1.', 'The Tenant shall notify the Landlord in writing in the event of any defect occurring in the main walls and/or roof, guttering or drainpipes and the Landlord shall be given a reasonable opportunity to remedy such defect (or have the Body Corporate remedy such defect if it is responsible therefor) and only if the Landlord fails to do so within a reasonable time, will the Tenant be entitled to have such defect remedied and to recover the reasonable cost thereof from the Landlord.');
    drawNumberedText('15.2.', 'The Landlord shall be responsible for the maintenance of the exterior of the Property, but specifically excluding the swimming pool and garden (if these are the Tenant’s responsibility).');
    drawNumberedText('15.3.', 'The Tenant shall be responsible for the maintenance of the interior of the Property, which shall include but not be limited to all appliances, furniture, floors, fitted carpets (if any), locks and keys, electric light fittings and light bulbs, doors, door frames, windows, window frames and window panes, and shall make good and repair any damage which may occur thereto, howsoever arising, and shall at the conclusion of the Agreement return the Property in the same good order and condition (fair wear and tear excepted).');
    drawNumberedText('15.4.1.', 'The Tenant shall be responsible for the maintenance and upkeeping, at their own costs, of the swimming pool and shall make good and repair any damage which may occur thereto, howsoever arising, and shall at the conclusion of the Agreement return it in good order and condition.');
    drawNumberedText('15.4.2.', 'The Tenant undertakes to take good and proper care of the garden on the Property, including, but not limited to, all lawns, plants, shrubs, trees and hedges, replacing all such as may die or be damaged (taking seasonal factors into account), and carrying out such watering, cutting, trimming, mowing, pruning, fertilising and other gardening activities as may reasonably be required, and supplying all the fertiliser and other substances necessary for these purposes.');
    drawRule();
    drawParagraph("");
  }
  function renderDestructionOfProperty() {
    drawSectionTitle('16.', 'Destruction of Property');
    drawNumberedText('16.1.', 'In the event of the destruction of the Property, or part of it, so as to render it substantially untenantable as a residence and whether such destruction is due to an act of God, war, riot, insurrection, civil strife or civil disturbance or any other cause including fire, flood, lightning or storm, the Agreement shall terminate on the happening of such event and no Rental shall be payable to the Landlord for the unexpired period of the Agreement from the happening of such event, and neither party shall have any claim against the other apart from any claims which may have existed immediately preceding the occurrence of such event.');
    drawNumberedText('16.2.', 'In the event however of partial destruction from the same or similar causes, the Agreement shall remain in full force and effect at the election of the Landlord, and the Landlord shall take steps as soon as may be reasonably possible for the repair of the Property and the Tenant shall be entitled to an abatement of the Rental commensurate with the extent to which he has been deprived of the use of the Property.');
    drawRule();
    drawParagraph("");
  }
  function renderAlteration() {
    drawSectionTitle('17.', 'Alterations');
    drawNumberedText('17.1.', 'The Tenant shall not make any alternations or additions, whether structural or otherwise, to the Property or any portion thereof without the Landlord’s prior written consent and in any event shall not be entitled to any compensation therefor and such improvements and/or additions shall belong to the Landlord upon termination of the Agreement. The Tenant further agrees not to interfere with any electrical installations or to connect any lamps, motors, or heaters other than those designed for use for the electric current.');
    drawNumberedText('17.2.', 'The Tenant shall not drive any screws or nails into the walls or ceilings without the Landlord’s prior approval.');
    drawNumberedText('17.3.', 'On termination of this Agreement, the Tenant agrees to restore the Property to the condition that the Tenant received it in at his own expense. Should the Tenant fail to do so within a reasonable time, the Landlord may have the Property repaired or restored and deduct such amounts payable from the deposit.');
    // Signatures section – formatted per new spec
    ensureSpace(180);
    drawParagraph('SIGNED at __________________ this _____day of __________________________ 20__.');
    drawParagraph('As witnesses:');
    ensureSpace(3 * (sizes.body + lineGap));
    for(let i = 0; i < 1; i++){
      page.drawLine({
        start: {
          x: margin,
          y: y - 2
        },
        end: {
          x: pageWidth - margin,
          y: y - 2
        },
        thickness: 0.8,
        color: colors.rule
      });
      y -= sizes.body + lineGap;
    }
    drawParagraph('_________________________________');
    drawParagraph('                    LANDLORD');
    ensureSpace(2 * (sizes.body + lineGap));
    for(let i = 0; i < 1; i++){
      page.drawLine({
        start: {
          x: margin,
          y: y - 2
        },
        end: {
          x: pageWidth - margin,
          y: y - 2
        },
        thickness: 0.8,
        color: colors.rule
      });
      y -= sizes.body + lineGap;
    }
    drawParagraph('SIGNED at __________________ this _____day of __________________________ 20__.');
    drawParagraph('As witnesses:');
    ensureSpace(3 * (sizes.body + lineGap));
    for(let i = 0; i < 1; i++){
      page.drawLine({
        start: {
          x: margin,
          y: y - 2
        },
        end: {
          x: pageWidth - margin,
          y: y - 2
        },
        thickness: 0.8,
        color: colors.rule
      });
      y -= sizes.body + lineGap;
    }
    drawParagraph('_________________________________');
    drawParagraph('                             TENANT');
    // Invisible DocuSign anchors near bottom for placement
    page.drawText('RentLekker_SIGN_LANDLORD', {
      x: margin + 120,
      y: margin + 80,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
    page.drawText('RentLekker_SIGN_TENANT_1', {
      x: margin + 120,
      y: margin + 40,
      size: 8,
      font: fontBody,
      color: colors.invisible
    });
  }
  drawBrandHeader(page);
  renderAgreementIntro();
  renderInterpretation();
  renderRecital();
  renderComsumer();
  renderRental();
  renderDuration();
  renderTermination();
  renderTBDeath();
  renderUse();
  renderBreachByLandlord();
  renderBreachByTenant();
  renderCancellationByLandlord();
  renderCancellationByTenant();
  renderConsequencesOfCancellation();
  renderInspectionAndAccess();
  renderMaintenance();
  renderAlteration();
  // If signatures exist, render them near the bottom anchors and include signed dates
  try {
    const landlordSigUrl = contract?.landlord_signature_data?.signature_image_url;
    const tenantSigUrl = contract?.tenant_signature_data?.signature_image_url;
    const landlordSignedAt = contract?.landlord_signed_at ? new Date(contract.landlord_signed_at) : null;
    const tenantSignedAt = contract?.tenant_signed_at ? new Date(contract.tenant_signed_at) : null;

    // Draw landlord signature image
    if (landlordSigUrl) {
      const img = await embedSignatureFromDataUrl(landlordSigUrl);
      if (img) {
        const targetHeight = 28;
        const scale = targetHeight / img.height;
        const targetWidth = img.width * scale;
        page.drawImage(img, {
          x: margin + 120,
          y: margin + 80,
          width: targetWidth,
          height: targetHeight,
        });
        if (landlordSignedAt) {
          const dateStr = landlordSignedAt.toLocaleDateString();
          const label = `Signed: ${dateStr}`;
          page.drawText(label, {
            x: margin + 120 + targetWidth + 12,
            y: margin + 88,
            size: sizes.small,
            font: fontBody,
            color: colors.muted,
          });
        }
      }
    }

    // Draw tenant signature image
    if (tenantSigUrl) {
      const img = await embedSignatureFromDataUrl(tenantSigUrl);
      if (img) {
        const targetHeight = 28;
        const scale = targetHeight / img.height;
        const targetWidth = img.width * scale;
        page.drawImage(img, {
          x: margin + 120,
          y: margin + 40,
          width: targetWidth,
          height: targetHeight,
        });
        if (tenantSignedAt) {
          const dateStr = tenantSignedAt.toLocaleDateString();
          const label = `Signed: ${dateStr}`;
          page.drawText(label, {
            x: margin + 120 + targetWidth + 12,
            y: margin + 48,
            size: sizes.small,
            font: fontBody,
            color: colors.muted,
          });
        }
      }
    }
  } catch {}
  // --- Finalize --- 
  drawFooter(page, pages.length);
  return await doc.save();
}
function generateLeaseHTML(contract) {
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
        ${data.additionalClauses.map((clause, index)=>`
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
function createSimplePDF(contract) {
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
function getOrdinalSuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch(day % 10){
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
async function generatePDFHash(pdfBuffer) {
  // Ensure we pass a plain ArrayBuffer to SubtleCrypto
  const start = pdfBuffer.byteOffset;
  const end = start + pdfBuffer.byteLength;
  const ab = pdfBuffer.buffer.slice(start, end);
  const hashBuffer = await crypto.subtle.digest('SHA-256', ab);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b)=>b.toString(16).padStart(2, '0')).join('');
}

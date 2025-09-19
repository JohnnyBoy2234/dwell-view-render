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
	const lineGap = 8;
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

	const drawLineMixed = (segments: { text: string; bold?: boolean }[]) => {
		const lineHeight = sizes.body + lineGap;
		ensureSpace(lineHeight);
		let x = margin;
		for (const seg of segments) {
			const font = seg.bold ? fontBold : fontBody;
			page.drawText(seg.text, { x, y, size: sizes.body, font, color: colors.text });
			x += font.widthOfTextAtSize(seg.text, sizes.body);
		}
		y -= lineHeight;
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
	page.drawText('Rental Agreement', { x: margin, y, size: sizes.h1, font: fontBold, color: colors.text });
	y -= sizes.h1 + 6;
	const gen = today.toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
	page.drawText(`Contract ID: ${contract.id}`, { x: margin, y, size: sizes.small, font: fontBody, color: colors.muted });
	const genText = `Generated: ${gen}`;
	page.drawText(genText, { x: pageWidth - margin - fontBody.widthOfTextAtSize(genText, sizes.small), y, size: sizes.small, font: fontBody, color: colors.muted });
	y -= sizes.small + 10;
	drawRule();

	// 1. BETWEEN
	drawHeading('1. Between:');
	const splitName = (full: string) => {
		if (!full) return { firstNames: 'Not specified', surname: '' };
		const parts = full.trim().split(/\s+/);
		if (parts.length === 1) return { firstNames: parts[0], surname: '' };
		return { firstNames: parts.slice(0, -1).join(' '), surname: parts[parts.length - 1] };
	};
	const landlordNameParts = splitName(data.landlordName || '');
	const renterNameParts = splitName(data.tenantName || '');
	const joinParts = (arr: string[]) => arr.filter(Boolean).join(', ');
	const landlordAddress = joinParts([
		data.landlordStreetAddress || data.landlordAddress || '',
		data.landlordCity || '',
		data.landlordPostalCode || '',
		data.landlordCountry || data.jurisdiction || ''
	]);
	const renterAddress = joinParts([
		data.tenantStreetAddress || data.tenantAddress || '',
		data.tenantCity || '',
		data.tenantPostalCode || '',
		data.tenantCountry || data.jurisdiction || ''
	]);
	drawLineMixed([
		{ text: '(1) ' },
		{ text: landlordNameParts.firstNames + ' ', bold: true },
		{ text: landlordNameParts.surname + ' ', bold: true },
		{ text: 'of ' },
		{ text: (landlordAddress || 'Not specified'), bold: true },
		{ text: ' (the "Landlord");' },
	]);
	drawLineMixed([
		{ text: '(2) ' },
		{ text: renterNameParts.firstNames + ' ', bold: true },
		{ text: renterNameParts.surname + ' ', bold: true },
		{ text: 'of ' },
		{ text: (renterAddress || 'Not specified'), bold: true },
		{ text: ' (the "Renter").' },
	]);
	drawRule();

	// IT IS AGREED as follows:
	drawHeading('It is agreed as follows:');

	// Rental Property
	drawHeading('Rental Property');
	const propertyAddress = joinParts([
		data.propertyStreetAddress || data.propertyAddress || '',
		data.propertyCity || '',
		data.propertyPostalCode || '',
		data.propertyCountry || data.jurisdiction || ''
	]);
	drawParagraph(`The Landlord agrees to rent and the Renter agrees to take the property known as ${propertyAddress || 'Not specified'} (the "Property").`);
	drawRule();

	// Rental Duration
	drawHeading('Rental Duration');
	const calcMonths = (start?: string, end?: string) => {
		if (!start || !end) return '';
		const s = new Date(start).getTime();
		const e = new Date(end).getTime();
		if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return '';
		const m = Math.ceil((e - s) / (1000 * 60 * 60 * 24 * 30.44));
		return `${m} month${m === 1 ? '' : 's'}`;
	};
	const rentalPeriod = data.rentalPeriod || calcMonths(data.leaseStartDate, data.leaseEndDate) || 'Not specified';
	drawParagraph(`The rental agreement shall be for a fixed term of ${rentalPeriod}.`);
	drawParagraph(`The rental period will commence on ${data.leaseStartDate || 'Not specified'} and will end on ${data.leaseEndDate || 'Not specified'}, unless terminated earlier or extended in accordance with the terms of this Agreement.`);
	drawParagraph('The Move-out day under this Rental Agreement shall be the final day of the rental term. By this date, the Renter must vacate the Property unless the Agreement is terminated earlier or extended in accordance with its terms.');
	drawParagraph('On the Move-out day, the Renter is required to vacate the Property, ensuring it is cleaned to the Landlord’s satisfaction and returned to its original condition as per the commencement of the Rental Agreement.');
	drawParagraph('On the Move-out day, the Renter must leave the Property under the Landlord’s control.');
	drawParagraph('Should the rental period continue after the end date without a new agreement, it will automatically become a periodic rental agreement, rolling on a monthly basis.');
	drawRule();

	// Rent Amount and Payment
	drawHeading('Rent Amount and Payment');
	const rentAmountText = `${data.rentAmount ? Number(data.rentAmount).toLocaleString('en-ZA') : 'Not specified'} ${data.rentCurrency || ''}`.trim();
	drawParagraph(`The rent amount is ${rentAmountText} per month (the "Rent").`);
	const dueDay = data.rentDueDay || 'Not specified';
	const suffix = typeof dueDay === 'number' ? getOrdinalSuffix(dueDay) : '';
	drawParagraph(`The Rent shall be payable in advance on the ${dueDay}${suffix} of each month (the "Due Date"). Payment shall be made by bank transfer to the Landlord’s designated account. The Landlord will provide the Renter with the necessary bank details before the first payment is due.`);
	drawParagraph('The Renter shall be in breach of this agreement if the Renter fails to pay the Rent in accordance with this clause. In such a case, the Landlord shall be entitled to use the relevant statutory provisions or any other statutory remedies available in the applicable jurisdiction to recover possession of the Property.');
	drawParagraph('If the Property is damaged or destroyed by an insured risk, making it unfit for occupation and use, the payment of Rent shall be suspended until the Property is fit for occupation and use, unless the damage or destruction was caused by the wilful actions, negligence, or default of the Renter.');
	drawParagraph('No increase in Rent shall occur during the fixed term unless both parties agree in writing.');
	drawParagraph('If the rental agreement becomes a rolling contract or is renewed after the fixed term, the Landlord reserves the right to review and increase the Rent once every 12 months.');
	drawParagraph('The Landlord shall provide the Renter with at least one month’s notice for monthly rolling agreements or two months’ notice for annual rent reviews regarding any proposed rent increase.');
	drawParagraph('Any rent increase must be reasonable and reflect current market conditions for similar properties in the area and shall comply with all relevant legislation.');
	drawRule();

	// Rent Default
	drawHeading('Rent Default');
	drawParagraph('The Renter shall pay interest on any Rent lawfully due that is paid more than 10 calendar days after the Due Date, at a rate of 5% per annum above the applicable central bank base rate in the country where the Property is located.');
	drawParagraph('The interest shall be payable from the Due Date until the date the Rent is actually paid.');
	drawRule();

	// Condition of the Property
	drawHeading('Condition of the Property');
	drawParagraph('The Property is rented in the condition it is in at the commencement of this Rental Agreement, as documented in the accompanying property inventory/condition report.');
	drawParagraph('The Renter accepts the Property in its current condition at the time of signing this Agreement.');
	drawRule();

	// Property Furnishings
	drawHeading('Property Furnishings');
	drawParagraph('The Property is let on an unfurnished basis. The Renter acknowledges that no furniture, fixtures, or fittings are provided by the Landlord, except for any essential fixtures required by law, such as smoke alarms, carbon monoxide detectors, or other legally required safety features in the country where the Property is located.');
	drawParagraph('The Renter is responsible for providing their own furniture and furnishings during the Rental Agreement and must ensure that any such items comply with relevant safety regulations applicable in the jurisdiction of the Property.');
	drawParagraph('At the end of the Rental Agreement, the Property must be returned in the same condition as at the start of the Rental Agreement, subject to fair wear and tear.');
	drawRule();

	// Landlord Obligations
	drawHeading('Landlord Obligations');
	const roman = (i: number) => ['(i)', '(ii)', '(iii)', '(iv)', '(v)', '(vi)', '(vii)', '(viii)', '(ix)', '(x)'][i] || `(${i + 1})`;
	[
		'Ensuring that the Property is equipped with functional and appropriately placed smoke detectors.',
		'Maintaining the structure and exterior of the Property in good condition.',
		'Providing the Renter with safe and suitable means of access to and from the Property.',
		'Allowing the Renter the quiet enjoyment of the Property without undue interruption.',
		'Keeping in repair and proper working order the installations in the Property for:',
	].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawParagraph('The supply of water, gas, and electricity;');
	drawParagraph('Sanitation, including basins, sinks, baths, and sanitary conveniences (excluding other fixtures, fittings, and appliances used in connection with these supplies);');
	drawParagraph('Space heating and water heating.');
	drawParagraph('The Landlord is not required to:');
	[
		'Carry out any works or repairs for which the Renter is liable under this Rental Agreement.',
		'Keep in repair or maintain any items that the Renter is entitled to remove from the Property.',
	].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawRule();

	// Renter Obligations
	drawHeading('Renter Obligations');
	const renterObligations = [
		'Pay the Rent promptly on the Due Date, without any deduction, set-off, or delay, and in the manner specified by the Landlord. The Renter acknowledges that timely payment of Rent is a fundamental obligation under this Agreement. If the Rent is not received by the Landlord on or before the Due Date, the Renter shall be considered in breach of this Agreement, and the Landlord may take appropriate action as set out in this Agreement or under applicable law, including the right to charge interest on overdue amounts.',
		'Keep the Property clean and tidy at all times, ensuring that it is free from waste and refuse, and maintaining the general upkeep of the Property, including but not limited to the interior, carpets, and furnishings.',
		'Notify the Landlord promptly of any damage, defects, or issues with the Property, including plumbing, electrical, or heating problems, to allow for necessary repairs or maintenance.',
		'Ensure that the Property is used solely for residential purposes and not for any commercial or business activities, without the prior written consent of the Landlord.',
		'Comply with all applicable laws and regulations in relation to the use and occupation of the Property, including but not limited to those concerning health and safety, waste disposal, and noise.',
		'Permit the Landlord or their representatives to access the Property at reasonable times (with notice, as per the terms of this Agreement), for the purpose of inspecting the Property, carrying out repairs, or showing the Property to prospective renters or buyers.',
		'Not make any alterations or additions to the Property, including installing or removing fixtures or fittings, without the prior written consent of the Landlord.',
		'Ensure that all keys, security devices, and access codes provided by the Landlord remain in the Renter’s possession and are not given to unauthorised persons. The Renter must return all keys and devices upon vacating the Property.',
		'Maintain appropriate insurance coverage for any personal belongings within the Property. The Landlord is not liable for any loss or damage to the Renter’s personal property.',
		'Dispose of refuse and recycling in accordance with local council guidelines and any instructions provided by the Landlord.',
		'Not sublet or assign the rental or allow anyone to occupy the Property without the prior written consent of the Landlord.',
		'Allow the Landlord to inspect the Property, with reasonable notice, to ensure compliance with the terms of this Agreement.',
		'Pay for all utilities and services connected to the Property, including but not limited to gas, electricity, water, council tax, and any other charges relating to the Property, unless otherwise agreed in writing.',
	];
	renterObligations.forEach((text, idx) => drawParagraph(`(${idx + 1}) ${text}`));
	drawRule();

	// Use of the Property
	drawHeading('Use of the Property');
	const occupants: string[] = Array.isArray(data.lawfulOccupants) ? data.lawfulOccupants : [data.tenantName || 'Renter'];
	occupants.forEach((name) => drawParagraph(`${name};`));
	drawParagraph('(the "Lawful Occupiers").');
	drawParagraph('The Renter agrees not to permit any individuals other than the Lawful Occupiers to reside in the Property without obtaining the Landlord\'s prior written consent, which shall not be unreasonably withheld.');
	drawRule();

	// Landlord\'s Right to Enter the Property
	drawHeading('Landlord\'s Right to Enter the Property');
	drawParagraph('The Landlord, or any person acting on behalf of the Landlord, reserves the right to enter the Property upon providing the Renter with at least 24 hours’ prior notice in writing for the following purposes:');
	['To inspect the condition and state of repair of the Property;', 'To carry out necessary repairs or maintenance as required under this Agreement;', 'To show the Property to prospective renters, buyers, or contractors (with reasonable notice);', 'To carry out any other actions permitted under the terms of this Agreement.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawParagraph('The Landlord shall retain a set of keys to the Property. These keys may only be used with the prior consent of the Renter, except in cases of emergency, such as a gas leak, electrical faults, or other urgent situations where immediate access is required to prevent harm or damage.');
	drawParagraph('The Landlord reserves the right to display a “for sale” or “to let” sign on the Property during the last two months of the rental period, in accordance with local laws and regulations.');
	drawParagraph('The Landlord reserves the right to re-enter the Property if:');
	['the Rent is unpaid 21 days after becoming payable, whether it has been formally demanded or not;', 'the Renter is declared bankrupt or insolvent under applicable law; or', 'the Renter has breached this Agreement.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawRule();

	// Security Deposit
	drawHeading('Security Deposit');
	drawHeading('Deposit Payment');
	drawParagraph(`The Renter shall pay a deposit of ${data.securityDeposit ? `${data.rentCurrency || 'ZAR'} ${Number(data.securityDeposit).toLocaleString('en-ZA')}` : '[SECURITY DEPOSIT AMOUNT]'} (the "Deposit") to the Landlord on or before the commencement of the Rental Agreement. The Deposit is held as security for any damage to the Property, unpaid rent, or other breaches of the terms of this Agreement.`);
	drawHeading('Use of Deposit');
	['To cover any unpaid rent or other financial obligations arising under this Agreement.', 'To repair any damage to the Property caused by the Renter, their guests, or visitors, beyond reasonable wear and tear.', 'To cover any cleaning costs if the Property is not returned in a clean and acceptable condition.', 'Any other costs directly related to the Renter’s breach of the Rental Agreement.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawHeading('Notification of Deposit Protection');
	drawParagraph('The Landlord shall ensure that the Deposit is held securely during the term of the rental agreement. The Renter will be provided with the details of where the Deposit is held, including the name of the holding party, contact details, and how to make a claim, within 30 days of receiving the Deposit.');
	drawHeading('Notification of Withholding');
	drawParagraph('If the Landlord intends to withhold any portion of the Deposit, they shall provide written notice to the Renter within 10 days of the end of the rental period, detailing the amount withheld and the reasons for the withholding. Any dispute regarding the amount to be withheld shall be resolved in accordance with the dispute resolution procedure outlined in this Agreement.');
	drawHeading('Transferring the Rental Agreement');
	drawParagraph('This Agreement may not be transferred to a third party, nor may the Property be sublet or reassigned without the Landlord\'s permission.');
	drawRule();

	// Termination of Agreement
	drawHeading('Termination of Agreement');
	drawParagraph('Either party may terminate this Agreement early, subject to the following notice requirements:');
	['Landlord’s Notice Requirement: The Landlord must provide at least two months’ written notice to the Renter for termination of this Agreement, with the notice ending on the last day of a rental period.', 'Renter’s Notice Requirement: The Renter must provide at least one month’s written notice to the Landlord for termination of this Agreement, with the notice ending on the last day of a rental period.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawParagraph('Either party may terminate this Agreement immediately under the following conditions:');
	['If the Property is unfit for habitation.', 'If the Landlord fails to make necessary repairs or meet legal obligations.', 'If there is a serious breach of contract by the other party.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawRule();

	// Pets
	drawHeading('Pets');
	drawParagraph('Pets are allowed in the Property, subject to the Renter obtaining prior written approval from the Landlord.');
	drawRule();

	// Notices
	drawHeading('Notices');
	drawHeading('Notice to the Landlord');
	drawParagraph('Any notice sent to the Landlord under or in connection with this Agreement shall be deemed to have been properly served if:');
	['Sent by first-class post to the Landlord\'s address for service as specified in this Agreement;', 'Left at the Landlord\'s address for service;', 'Sent to the Landlord\'s provided email address; or', 'Sent to any other contact details the Landlord has provided to the Renter during the term of this Agreement.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawHeading('Notice to the Renter');
	drawParagraph('Any notice sent to the Renter under or in connection with this Agreement shall be deemed to have been properly served if:');
	['Sent by first-class post to the Property;', 'Left at the Property; or', 'Sent to the Renter\'s provided email address.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawHeading('Deemed Receipt');
	drawParagraph('Notice shall be deemed to have been received:');
	['If delivered by hand, at the time the notice is left at the proper address;', 'If sent by first-class post, on the second working day after posting;', 'If sent by email, at 9:00 am on the next working day after sending.'].forEach((item, idx) => drawParagraph(`${roman(idx)} ${item}`));
	drawHeading('Landlord\'s Address for Service');
	drawParagraph('The Landlord\'s address for service is the address specified in this Agreement.');
	drawRule();

	// Dispute Resolution
	drawHeading('Dispute Resolution');
	drawParagraph('If any dispute arises out of or in connection with this Agreement, including any question regarding its existence, validity, or termination, the parties shall first attempt to resolve the dispute through good-faith negotiations between themselves.');
	drawParagraph('If the parties are unable to resolve the dispute through negotiation within 28 days of the dispute arising, either party may initiate mediation by serving written notice to the other party, specifying the nature of the dispute and the intention to mediate.');
	drawParagraph('The mediation shall be conducted by a mediator appointed by mutual agreement of the parties.');
	drawParagraph('If mediation does not resolve the dispute within 28 days of the mediator’s appointment (or any other agreed period), either party may then pursue the dispute through the courts or other legal channels available to them.');
	drawRule();

	// Governing Law and Jurisdiction
	drawHeading('Governing Law and Jurisdiction');
	const jurisdiction = data.jurisdiction || 'South Africa';
	drawParagraph('This Agreement shall be governed by and construed in accordance with the laws of South Africa.');
	drawParagraph(`Each party irrevocably agrees that the courts of ${jurisdiction} shall have exclusive jurisdiction to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with this agreement or its subject matter or formation.`);

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
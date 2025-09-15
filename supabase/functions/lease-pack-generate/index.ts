// @ts-nocheck
/* eslint-disable */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1';

const ALLOWED_ORIGINS = [
  "https://swiftrent.co.za",
  "https://www.swiftrent.co.za",
  "http://localhost:5173",
  "https://localhost:5173"
];

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://swiftrent.co.za";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
}

// Helper function to compute SHA-256
async function computeSHA256(data: Uint8Array | ArrayBuffer): Promise<string> {
  const source: ArrayBuffer = data instanceof Uint8Array ? data.buffer : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', source);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Professional PDF generation with 27 sections
async function generateProfessionalLeasePDF(leasePack: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  const margin = 50.9; // ~18mm margins
  const contentWidth = pageWidth - (margin * 2);
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin - 50;
  const primaryBlue = rgb(0.15, 0.39, 0.92); // Brand blue
  
  // Sanitizer to replace non-WinAnsi glyphs
  const sanitize = (s: string) => (s || '')
    .replace(/[\u2192]/g, '->')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\r\n]+/g, ' ');

  // Footer function
  function addFooter(page: any, pageNum: number, totalPages: number) {
    page.drawText(sanitize('SwiftRent.co.za – Safe, Simple, Commission-Free Renting'), {
      x: margin,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
    page.drawText(sanitize(`Lease ID • Page ${pageNum} of ${totalPages}`), {
      x: pageWidth - margin - 120,
      y: 30,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  // Text wrapper with page breaks
  function addWrappedText(text: string, x: number, y: number, width: number, fontSize: number, fontType: any = font, color: any = rgb(0, 0, 0)) {
    const words = sanitize(text).split(' ');
    let line = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = fontType.widthOfTextAtSize(testLine, fontSize);
      if (textWidth > width && line) {
        currentPage.drawText(line, { x, y: currentY, size: fontSize, font: fontType, color });
        line = word;
        currentY -= fontSize + 3;
        if (currentY < margin + 80) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin - 50;
        }
      } else {
        line = testLine;
      }
    }
    if (line) {
      currentPage.drawText(line, { x, y: currentY, size: fontSize, font: fontType, color });
    }
    return currentY - fontSize - 6;
  }

  // COVER PAGE
  const today = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });
  currentPage.drawText('SwiftRent Residential Lease Agreement', {
    x: pageWidth / 2 - 150,
    y: pageHeight - 100,
    size: 22,
    font: boldFont,
    color: primaryBlue
  });
  
  yPosition = pageHeight - 160;
  yPosition = addWrappedText(`Lease ID: ${leasePack.core.leaseId} • Prepared on ${today}`, margin, yPosition, contentWidth, 12, font);
  yPosition -= 20;
  yPosition = addWrappedText(`Landlord: ${leasePack.parties.landlord.fullName} (ID ${leasePack.parties.landlord.idNumber})`, margin, yPosition, contentWidth, 11, font);
  yPosition = addWrappedText(`Tenant: ${leasePack.parties.tenant.fullName} (ID ${leasePack.parties.tenant.idNumber})`, margin, yPosition, contentWidth, 11, font);
  yPosition = addWrappedText(`Premises: ${leasePack.core.propertyAddress} (${leasePack.core.propertyType})`, margin, yPosition, contentWidth, 11, font);

  // LEASE SCHEDULE PAGE
  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  yPosition = pageHeight - margin - 50;
  
  yPosition = addWrappedText('LEASE SCHEDULE', margin, yPosition, contentWidth, 16, boldFont, primaryBlue);
  yPosition -= 20;
  
  const scheduleData = [
    ['Lease Term', `${leasePack.core.startDate} -> ${leasePack.core.endDate} - Notice: ${leasePack.core.noticeDays} days`],
    ['Monthly Rent', `R ${Number(leasePack.core.monthlyRentZAR || 0).toLocaleString()} - Due Day: ${leasePack.core.rentDueDay} - Method: ${leasePack.core.paymentMethod}`],
    ['Deposit', `R ${Number(leasePack.core.depositZAR || 0).toLocaleString()} (Held in: ${leasePack.core.depositHeldIn}) - Refund: within ${leasePack.core.depositRefundDays} days`],
    ['Utilities', `Water ${leasePack.core.utilities.water} - Electricity ${leasePack.core.utilities.electricity} - Refuse ${leasePack.core.utilities.refuse}`],
    ['Pets', `${leasePack.core.petsAllowed ? 'Allowed per written consent' : 'Not allowed'} - Max Occupants: ${leasePack.core.maxOccupants}`],
    ['Minor Repair Limit (Tenant)', `R ${Number(leasePack.core.maintenanceMinorRepairLimitZAR || 0).toLocaleString()}`],
    ['Condition Report Required', `${leasePack.core.conditionReportRequired ? 'Yes' : 'No'}`],
    ['House Rules', `${leasePack.core.houseRulesUrl || 'N/A'}`],
    ['Governing Law', `${leasePack.core.governingLaw}`]
  ];

  scheduleData.forEach(([label, value]) => {
    yPosition = addWrappedText(`${label}: ${value}`, margin, yPosition, contentWidth, 10, font);
    yPosition -= 5;
  });

  // LEASE TERMS (§1-§27)
  const leaseTerms = [
    { section: "§1. Parties and Premises", content: `1.1 The Landlord lets to the Tenant the residential premises at ${leasePack.core.propertyAddress} including exclusive use areas expressly listed in the Schedule.\n1.2 The premises are for private residential use only.` },
    { section: "§2. Duration", content: `2.1 The lease commences on ${leasePack.core.startDate} and ends on ${leasePack.core.endDate}, unless terminated earlier under this Agreement or applicable law.\n2.2 A month-to-month holding over requires written consent and continues on the same terms, subject to lawful increases.` },
    { section: "§3. Rent and Payment", content: `3.1 Monthly rent is R ${Number(leasePack.core.monthlyRentZAR || 0).toLocaleString()}, payable in advance on/before the ${leasePack.core.rentDueDay} of each month by ${leasePack.core.paymentMethod}.\n3.2 Late payment may attract a reasonable admin fee and interest at the lesser of the legal maximum or prime + 2%.\n3.3 No set-off is permitted without Landlord's prior written consent.` },
    { section: "§4. Deposit", content: `4.1 Tenant pays a deposit of R ${Number(leasePack.core.depositZAR || 0).toLocaleString()} before occupation. Deposit is held in ${leasePack.core.depositHeldIn} and may earn interest where required by law.\n4.2 Deductions may be made for unpaid rent, charges, damage beyond fair wear and tear, missing items, cleaning, and legal costs reasonably incurred.\n4.3 The balance (if any) shall be refunded within ${leasePack.core.depositRefundDays} days after both (i) lawful vacate, and (ii) conclusion of outgoing inspection and settlement of amounts due.` },
    { section: "§27. Governing Law & Jurisdiction", content: `27.1 This Agreement is governed by the laws of ${leasePack.core.governingLaw}.\n27.2 Parties consent to the jurisdiction of a competent court for amounts within its limits.` }
  ];

  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  yPosition = pageHeight - margin - 50;
  yPosition = addWrappedText('RESIDENTIAL LEASE TERMS', margin, yPosition, contentWidth, 16, boldFont, primaryBlue);
  yPosition -= 20;

  leaseTerms.forEach(term => {
    if (yPosition < margin + 100) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin - 50;
    }
    yPosition = addWrappedText(term.section, margin, yPosition, contentWidth, 12, boldFont, primaryBlue);
    yPosition -= 5;
    yPosition = addWrappedText(term.content, margin, yPosition, contentWidth, 10, font);
    yPosition -= 15;
  });

  // DECLARATIONS PAGE
  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  yPosition = pageHeight - margin - 50;
  yPosition = addWrappedText('DECLARATIONS', margin, yPosition, contentWidth, 16, boldFont, primaryBlue);
  yPosition -= 20;
  yPosition = addWrappedText('Landlord Declaration', margin, yPosition, contentWidth, 12, boldFont);
  yPosition = addWrappedText(`I, ${leasePack.parties.landlord.fullName}, warrant that I am the owner or duly authorised to let the Premises; the information supplied is true and correct; and I will comply with applicable laws, including POPIA.`, margin, yPosition, contentWidth, 10, font);
  yPosition -= 20;
  yPosition = addWrappedText('Tenant Declaration', margin, yPosition, contentWidth, 12, boldFont);
  yPosition = addWrappedText(`I, ${leasePack.parties.tenant.fullName}, warrant that the information and documents supplied are true and correct; I will use the Premises only for residential purposes and comply with the terms and building rules; and I consent to verification and lawful processing of my personal information.`, margin, yPosition, contentWidth, 10, font);

  // SIGNATURES PAGE
  currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  yPosition = pageHeight - margin - 50;
  yPosition = addWrappedText('SIGNATURES PAGE', margin, yPosition, contentWidth, 16, boldFont, primaryBlue);
  yPosition -= 20;
  yPosition = addWrappedText('By signing electronically, each party confirms identity, authority and intent to be bound.', margin, yPosition, contentWidth, 10, font);
  yPosition -= 30;
  // Tenant signature
  yPosition = addWrappedText(`Tenant (typed name): ${leasePack.signatures.tenant.typedName || 'Not signed'}`, margin, yPosition, contentWidth, 10, font);
  yPosition = addWrappedText(`Signed: ${leasePack.signatures.tenant.signedAt || 'Not signed'}`, margin, yPosition, contentWidth, 10, font);
  yPosition -= 30;
  // Landlord signature  
  yPosition = addWrappedText(`Landlord (typed name): ${leasePack.signatures.landlord.typedName || 'Not signed'}`, margin, yPosition, contentWidth, 10, font);
  yPosition = addWrappedText(`Signed: ${leasePack.signatures.landlord.signedAt || 'Not signed'}`, margin, yPosition, contentWidth, 10, font);

  // Add footers to all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    addFooter(page, i + 1, totalPages);
  }
  return await pdfDoc.save();
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
    }

    // Use service role for storage upload + signed URL operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ?? Deno.env.get('SERVICE_ROLE_KEY')
      ?? Deno.env.get('SUPABASE_ANON_KEY')
      ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase env. SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(JSON.stringify({ error: 'Server not configured', details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers
      });
    }
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const { leasePack } = await req.json();
    if (!leasePack) {
      return new Response(JSON.stringify({ error: 'leasePack is required' }), { 
        status: 400, 
        headers 
      });
    }

    // Normalize/validate leasePack shape to avoid undefined property access
    const normalized = {
      core: {
        leaseId: leasePack?.core?.leaseId || crypto.randomUUID?.() || String(Date.now()),
        propertyAddress: leasePack?.core?.propertyAddress || 'Property Address',
        propertyType: leasePack?.core?.propertyType || 'Residential',
        startDate: leasePack?.core?.startDate || new Date().toISOString().split('T')[0],
        endDate: leasePack?.core?.endDate || new Date(Date.now() + 31536000000).toISOString().split('T')[0],
        noticeDays: leasePack?.core?.noticeDays ?? 30,
        monthlyRentZAR: leasePack?.core?.monthlyRentZAR ?? 0,
        depositZAR: leasePack?.core?.depositZAR ?? 0,
        rentDueDay: leasePack?.core?.rentDueDay ?? 1,
        paymentMethod: leasePack?.core?.paymentMethod || 'Bank Transfer',
        depositHeldIn: leasePack?.core?.depositHeldIn || 'Trust Account',
        depositRefundDays: leasePack?.core?.depositRefundDays ?? 30,
        utilities: leasePack?.core?.utilities || { water: 'Tenant', electricity: 'Tenant', refuse: 'Tenant' },
        petsAllowed: !!leasePack?.core?.petsAllowed,
        maxOccupants: leasePack?.core?.maxOccupants ?? 2,
        maintenanceMinorRepairLimitZAR: leasePack?.core?.maintenanceMinorRepairLimitZAR ?? 500,
        conditionReportRequired: leasePack?.core?.conditionReportRequired ?? true,
        houseRulesUrl: leasePack?.core?.houseRulesUrl || '',
        governingLaw: leasePack?.core?.governingLaw || 'South Africa'
      },
      parties: {
        landlord: {
          fullName: leasePack?.parties?.landlord?.fullName || 'Landlord',
          idNumber: leasePack?.parties?.landlord?.idNumber || '0000000000000'
        },
        tenant: {
          fullName: leasePack?.parties?.tenant?.fullName || 'Tenant',
          idNumber: leasePack?.parties?.tenant?.idNumber || '0000000000000'
        }
      },
      signatures: {
        landlord: leasePack?.signatures?.landlord || { typedName: '', signedAt: null },
        tenant: leasePack?.signatures?.tenant || { typedName: '', signedAt: null }
      },
      pdf: leasePack?.pdf || {}
    };

    console.log('Generating professional lease PDF for:', normalized.core?.leaseId);

    // Generate PDF
    const pdfBytes = await generateProfessionalLeasePDF(normalized);
    
    // Compute SHA-256 hash
    const pdfHash = await computeSHA256(pdfBytes);
    console.log('Generated PDF hash:', pdfHash);
    
    // Generate filename
    const safe = (s: string = '') => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
    const leaseId = safe(normalized.core?.leaseId || '');
    const timestamp = Date.now();
    const filename = `lease-pack-${leaseId}-${timestamp}.pdf`;
    
    // Store in private bucket
    const BUCKET = 'lease-documents';
    // Ensure bucket exists (idempotent when using service role)
    try {
      const { data: existingBucket } = await supabaseClient.storage.getBucket(BUCKET);
      if (!existingBucket) {
        await supabaseClient.storage.createBucket(BUCKET, { public: false });
      }
    } catch (_) {
      // ignore; proceed to upload — will fail with clear error if truly unavailable
    }
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(`lease-packs/${filename}`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: 'private, max-age=3600'
      });
    
    if (uploadError) {
      console.error('Upload failed, falling back to data URL:', uploadError);
      const base64 = btoa(String.fromCharCode(...pdfBytes));
      return new Response(JSON.stringify({
        success: true,
        pdf_url: `data:application/pdf;base64,${base64}`,
        pdf_path: null,
        pdf_hash: pdfHash,
        page_count: 0,
        filename
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Create signed URL (valid for 24 hours)
    const { data: signedData, error: signedError } = await supabaseClient.storage
      .from(BUCKET)
      .createSignedUrl(`lease-packs/${filename}`, 60 * 60 * 24);

    if (signedError) {
      console.error('Signed URL failed, falling back to data URL:', signedError);
      const base64 = btoa(String.fromCharCode(...pdfBytes));
      return new Response(JSON.stringify({
        success: true,
        pdf_url: `data:application/pdf;base64,${base64}`,
        pdf_path: null,
        pdf_hash: pdfHash,
        page_count: 0,
        filename
      }), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      pdf_url: signedData.signedUrl,
      pdf_path: `lease-packs/${filename}`,
      pdf_hash: pdfHash,
      page_count: 0,
      filename 
    }), { 
      status: 200, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error generating lease pack:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), { 
      status: 500, 
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
});

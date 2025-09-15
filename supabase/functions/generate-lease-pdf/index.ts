import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const ALLOWED_ORIGINS = [
  "https://swiftrent.co.za",
  "http://localhost:5173",
  "https://localhost:5173"
];

function corsHeaders(origin: string | null, allowHeaders?: string | null) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "https://swiftrent.co.za";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin", 
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": allowHeaders || "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Max-Age": "86400",
  };
}

interface LeaseData {
  landlord: {
    name: string;
    id_number: string;
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  tenant: {
    name: string;
    id_number: string;
    email: string;
    phone: string;
    current_address: string;
    occupants: Array<{
      name: string;
      relationship: string;
      age: string;
    }>;
  };
  property: {
    address: string;
    unit: string;
    city: string;
    province: string;
    postal_code: string;
    type: 'apartment' | 'house' | 'townhouse';
    parking: 'N/A' | '1 bay' | '2 bays';
  };
  term: {
    start_date: string;
    end_date: string;
    option_to_renew: boolean;
    notice_period_days: number;
  };
  rent: {
    monthly_rent: number;
    due_day: number;
    payment_method: 'EFT' | 'Cash' | 'Cheque';
    late_fee_policy: {
      grace_days: number;
      late_fee_fixed: number;
      late_fee_percent: number;
    };
  };
  deposit: {
    amount: number;
    return_days: number;
  };
  utilities: {
    water: 'tenant' | 'landlord' | 'included';
    electricity: 'tenant' | 'landlord' | 'included';
    internet: 'tenant' | 'landlord' | 'included';
    other: string;
  };
  maintenance: {
    tenant_minor_repairs_cap: number;
    landlord_responsible: string[];
  };
  access: {
    entry_notice_hours: number;
  };
  governing_law: string;
  attachments: {
    move_in_inspection_required: boolean;
    annexures: string[];
  };
  branding: {
    logo_url: string;
    primary_hex: string;
    secondary_hex: string;
    font_family: string;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString()}`;
}

async function generateLeasePDF(leaseData: LeaseData, version: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 56.69; // 20mm in points
  const contentWidth = pageWidth - (margin * 2);
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin - 50;
  
  // Helper function to add text with word wrapping
  function addText(text: string, x: number, y: number, width: number, fontSize: number, fontType: any = font, color: any = rgb(0, 0, 0)) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = fontType.widthOfTextAtSize(testLine, fontSize);
      
      if (textWidth > width && line) {
        currentPage.drawText(line, { x, y: currentY, size: fontSize, font: fontType, color });
        line = word;
        currentY -= fontSize + 2;
        
        // Check if we need a new page
        if (currentY < margin + 80) { // Leave space for footer
          // Add footer to current page
          const pageNum = pdfDoc.getPageCount();
          addPageFooter(currentPage, pageNum, pageNum + 1); // We'll update total pages later
          
          // Create new page
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
    
    return currentY - fontSize - 2;
  }
  
  // Helper function to add header to first page only
  async function addFirstPageHeader(page: any) {
    // Try to load SwiftRent logo from Storage
    let logoImage: any = null;
    try {
      // Try to load logo from Supabase Storage
      const logoUrl = leaseData.branding?.logo_url;
      if (logoUrl) {
        const response = await fetch(logoUrl);
        if (response.ok) {
          const logoBytes = new Uint8Array(await response.arrayBuffer());
          logoImage = await pdfDoc.embedPng(logoBytes);
        }
      }
    } catch (error) {
      console.log('Logo not found, using brand square');
    }

    if (logoImage) {
      // If logo is available, draw it without text
      const logoW = 60;
      const aspect = logoImage.height / logoImage.width;
      const logoH = logoW * aspect;
      page.drawImage(logoImage, { 
        x: margin, 
        y: pageHeight - 50 - logoH, 
        width: logoW, 
        height: logoH 
      });
    } else {
      // Brand square without text (logo is visual)
      page.drawRectangle({ 
        x: margin, 
        y: pageHeight - 50, 
        width: 20, 
        height: 20, 
        color: rgb(0.15, 0.39, 0.92) // ocean-blue
      });
    }
    
    // Document title (center)
    page.drawText('Residential Lease Agreement', { 
      x: pageWidth / 2 - 100, 
      y: pageHeight - 30, 
      size: 14, 
      font: boldFont, 
      color: rgb(0, 0, 0)
    });
    
    // Version (right)
    page.drawText(`v${version}`, { 
      x: pageWidth - margin - 20, 
      y: pageHeight - 30, 
      size: 10, 
      font: font, 
      color: rgb(0.5, 0.5, 0.5)
    });
  }

  // Helper function to add footer to each page
  function addPageFooter(page: any, pageNum: number, totalPages: number) {
    // Footer
    page.drawText(`SwiftRent • ${leaseData.property.address} • Page ${pageNum} of ${totalPages}`, { 
      x: margin, 
      y: 30, 
      size: 8, 
      font: font, 
      color: rgb(0.5, 0.5, 0.5)
    });
  }
  
  // Add header to first page only
  await addFirstPageHeader(currentPage);
  
  // Start content below header
  yPosition = pageHeight - margin - 100;
  
  // Agreement date
  yPosition = addText(`This Agreement is made on ${formatDate(new Date().toISOString())}`, margin, yPosition, contentWidth, 12, font);
  yPosition -= 20;
  
  // Parties section
  yPosition = addText('1. PARTIES', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`LANDLORD: ${leaseData.landlord.name}`, margin, yPosition, contentWidth, 12, boldFont);
  yPosition = addText(`ID Number: ${leaseData.landlord.id_number}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Address: ${leaseData.landlord.address}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Email: ${leaseData.landlord.email}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Phone: ${leaseData.landlord.phone}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition -= 10;
  
  yPosition = addText(`TENANT: ${leaseData.tenant.name}`, margin, yPosition, contentWidth, 12, boldFont);
  yPosition = addText(`ID Number: ${leaseData.tenant.id_number}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Current Address: ${leaseData.tenant.current_address}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Email: ${leaseData.tenant.email}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Phone: ${leaseData.tenant.phone}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition -= 20;
  
  // Property section
  yPosition = addText('2. PROPERTY', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The Landlord lets and the Tenant takes the property situated at:`, margin, yPosition, contentWidth, 11, font);
  yPosition = addText(`${leaseData.property.address}`, margin + 20, yPosition, contentWidth - 20, 11, boldFont);
  if (leaseData.property?.unit) {
    yPosition = addText(`Unit: ${leaseData.property.unit}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  }
  yPosition = addText(`${leaseData.property?.city || ''}, ${leaseData.property?.province || ''} ${leaseData.property?.postal_code || ''}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Property Type: ${leaseData.property?.type || 'apartment'}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`Parking: ${leaseData.property?.parking || 'N/A'}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition -= 20;
  
  // Term section
  yPosition = addText('3. TERM', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The lease shall commence on ${formatDate(leaseData.term.start_date)} and terminate on ${formatDate(leaseData.term.end_date)}.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 10;
  
  if (leaseData.term?.option_to_renew) {
    yPosition = addText(`The Tenant shall have the option to renew this lease for a further period of 12 months, provided that written notice is given to the Landlord at least ${leaseData.term.notice_period_days} days before the expiration of the current term.`, margin, yPosition, contentWidth, 11, font);
    yPosition -= 10;
  }
  
  yPosition = addText(`Either party may terminate this lease by giving ${leaseData.term?.notice_period_days ?? 30} days written notice to the other party.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Rent section
  yPosition = addText('4. RENT', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The monthly rent is ${formatCurrency(leaseData.rent.monthly_rent)} and is due on the ${leaseData.rent.due_day}${leaseData.rent.due_day === 1 ? 'st' : leaseData.rent.due_day === 2 ? 'nd' : leaseData.rent.due_day === 3 ? 'rd' : 'th'} day of each month.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 10;
  
  yPosition = addText(`Payment Method: ${leaseData.rent?.payment_method || 'EFT'}`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 10;
  
  const late = leaseData.rent?.late_fee_policy || { grace_days: 0, late_fee_fixed: 0, late_fee_percent: 0 };
  if ((late.late_fee_fixed ?? 0) > 0 || (late.late_fee_percent ?? 0) > 0) {
    yPosition = addText(`Late Payment: If rent is not paid within ${late.grace_days ?? 0} days of the due date, a late fee will apply.`, margin, yPosition, contentWidth, 11, font);
    if ((late.late_fee_fixed ?? 0) > 0) {
      yPosition = addText(`Fixed Late Fee: ${formatCurrency(late.late_fee_fixed)}`, margin + 20, yPosition, contentWidth - 20, 11, font);
    }
    if ((late.late_fee_percent ?? 0) > 0) {
      yPosition = addText(`Percentage Late Fee: ${late.late_fee_percent}% of monthly rent`, margin + 20, yPosition, contentWidth - 20, 11, font);
    }
    yPosition -= 10;
  }
  yPosition -= 20;
  
  // Deposit section
  yPosition = addText('5. DEPOSIT', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The Tenant shall pay a deposit of ${formatCurrency(leaseData.deposit.amount)} upon signing this lease. The deposit shall be refunded within ${leaseData.deposit.return_days} days of the termination of the lease, less any deductions for damages or outstanding amounts.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Utilities section
  yPosition = addText('6. UTILITIES', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`Utilities are the responsibility of the Tenant unless otherwise specified:`, margin, yPosition, contentWidth, 11, font);
  yPosition = addText(`• Water: ${leaseData.utilities?.water || 'tenant'}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`• Electricity: ${leaseData.utilities?.electricity || 'tenant'}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  yPosition = addText(`• Internet: ${leaseData.utilities?.internet || 'tenant'}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  if (leaseData.utilities?.other) {
    yPosition = addText(`• Other: ${leaseData.utilities?.other}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  }
  yPosition -= 20;
  
  // Maintenance section
  yPosition = addText('7. MAINTENANCE', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The Tenant is responsible for minor repairs up to ${formatCurrency(leaseData.maintenance?.tenant_minor_repairs_cap ?? 0)}. The Landlord is responsible for:`, margin, yPosition, contentWidth, 11, font);
  (leaseData.maintenance?.landlord_responsible || []).forEach(responsibility => {
    yPosition = addText(`• ${responsibility}`, margin + 20, yPosition, contentWidth - 20, 11, font);
  });
  yPosition -= 20;
  
  // Access section
  yPosition = addText('8. ACCESS', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`The Landlord shall give at least ${leaseData.access?.entry_notice_hours ?? 24} hours notice before entering the property, except in cases of emergency.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Governing law section
  yPosition = addText('9. GOVERNING LAW', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  yPosition = addText(`This lease is governed by the laws of ${leaseData.governing_law || 'South Africa'}.`, margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Additional terms
  yPosition = addText('10. ADDITIONAL TERMS', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 10;
  
  if (leaseData.attachments?.move_in_inspection_required) {
    yPosition = addText(`A move-in inspection is required and must be completed within 7 days of occupancy.`, margin, yPosition, contentWidth, 11, font);
    yPosition -= 10;
  }
  
  if ((leaseData.attachments?.annexures || []).length > 0) {
    yPosition = addText(`The following annexures form part of this lease:`, margin, yPosition, contentWidth, 11, font);
    (leaseData.attachments?.annexures || []).forEach((annexure, index) => {
      yPosition = addText(`• Annexure ${String.fromCharCode(65 + index)}: ${annexure}`, margin + 20, yPosition, contentWidth - 20, 11, font);
    });
    yPosition -= 10;
  }
  yPosition -= 20;
  
  // Signature section
  yPosition = addText('11. SIGNATURES', margin, yPosition, contentWidth, 14, boldFont, rgb(0.15, 0.39, 0.92));
  yPosition -= 20;
  
  // Landlord signature
  yPosition = addText('LANDLORD:', margin, yPosition, contentWidth, 12, boldFont);
  yPosition -= 30;
  yPosition = addText('Signature: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition = addText('Name: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition = addText('Date: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Tenant signature
  yPosition = addText('TENANT:', margin, yPosition, contentWidth, 12, boldFont);
  yPosition -= 30;
  yPosition = addText('Signature: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition = addText('Name: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition = addText('Date: _________________________', margin, yPosition, contentWidth, 11, font);
  yPosition -= 20;
  
  // Add footers to all pages
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    addPageFooter(page, i + 1, totalPages);
  }
  
  return await pdfDoc.save();
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  // Echo requested headers to satisfy browser preflight
  const requestedHeaders = req.headers.get("access-control-request-headers");
  const headers = corsHeaders(origin, requestedHeaders);

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('PROJECT_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') 
        ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        ?? Deno.env.get('SUPABASE_ANON_KEY')
        ?? ''
    )

    const { lease_data, version = 1 } = await req.json()

    if (!lease_data) {
      return new Response(JSON.stringify({ error: 'lease_data is required' }), { 
        status: 400, 
        headers 
      })
    }

    // Generate PDF
    const pdfBytes = await generateLeasePDF(lease_data, version)
    
    // Convert to base64 for storage (kept for potential email)
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes))
    
    // Generate a unique, cache-busting filename
    const safe = (s: string | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document'
    const city = safe((lease_data as any)?.property?.city)
    const tenantLast = safe(((lease_data as any)?.tenant?.name || '').split(' ').pop() as string)
    const start = safe((lease_data as any)?.term?.start_date)
    const stamp = Date.now()
    const filename = `Lease_${city}_${tenantLast}_${start}_v${version}_${stamp}.pdf`
    
    // Ensure bucket exists and is public
    const BUCKET = 'lease-documents'
    try {
      const { data: buckets } = await (supabaseClient as any).storage.listBuckets?.()
      const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === BUCKET)
      if (!exists && (supabaseClient as any).storage.createBucket) {
        await (supabaseClient as any).storage.createBucket(BUCKET, { public: true })
      } else if (exists && (supabaseClient as any).storage.updateBucket) {
        // Make sure it's public if it already exists
        try { await (supabaseClient as any).storage.updateBucket(BUCKET, { public: true }) } catch (_) {}
      }
    } catch (e) {
      console.log('Bucket ensure skipped/failed:', e)
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(BUCKET)
      .upload(filename, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: 'no-store, max-age=0, must-revalidate'
      })
    
    if (uploadError) {
      console.log('Upload failed (will fall back to data URL):', uploadError.message)
    }

    // Get public or signed URL
    const { data: urlData } = supabaseClient.storage
      .from(BUCKET)
      .getPublicUrl(filename)

    let pdfUrl = (urlData as any)?.publicUrl ? `${(urlData as any).publicUrl}?t=${stamp}` : undefined

    if (!pdfUrl) {
      try {
        // As a fallback, create a signed URL valid for 24 hours
        const { data: signedData, error: signedErr } = await supabaseClient.storage
          .from(BUCKET)
          .createSignedUrl(filename, 60 * 60 * 24, { download: filename })
        if (!signedErr && signedData?.signedUrl) {
          pdfUrl = `${signedData.signedUrl}&t=${stamp}`
        }
      } catch (e) {
        console.log('Signed URL generation failed:', e)
      }
    }

    // Absolute last-resort fallback: return data URL so client can still download
    if (!pdfUrl) {
      try {
        pdfUrl = `data:application/pdf;base64,${pdfBase64}`
      } catch (_) {}
    }

    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: 'No URL returned for uploaded PDF' }), { 
        status: 502, 
        headers 
      })
    }

    return new Response(JSON.stringify({ success: true, pdf_url: pdfUrl, filename }), { 
      status: 200, 
      headers 
    })

  } catch (error) {
    console.error('Error generating lease PDF:', error)
    let msg = 'Unknown error'
    try { msg = (error as any)?.message || String(error) } catch {}
    return new Response(JSON.stringify({ error: msg }), { 
      status: 500, 
      headers 
    })
  }
})

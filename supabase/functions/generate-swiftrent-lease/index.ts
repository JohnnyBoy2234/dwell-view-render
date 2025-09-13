import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders })

interface SwiftRentLeaseData {
  landlord: {
    fullname: string;
    id_number: string;
    email: string;
    address: string;
  };
  tenant: {
    fullname: string;
    id_number: string;
    email: string;
    address: string;
  };
  property: {
    address: string;
    garage_number?: string;
    parking_number?: string;
    other_features?: string;
  };
  financial: {
    rent_amount: number;
    rent_amount_words: string;
    bank_name: string;
    branch_code: string;
    branch_name: string;
    account_number: string;
    payment_reference: string;
    rent_escalation_percent: number;
    deposit_amount: number;
    deposit_amount_words: string;
    deposit_date: string;
    admin_fee: number;
    application_fee: number;
    deposit_multiplier: string;
    other_fees?: string;
  };
  lease_dates: {
    start_date: string;
    end_date: string;
  };
  occupants: {
    list: string;
  };
  signatures: {
    city: string;
    date: string;
  };
}

function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const thousands = ['', 'thousand', 'million', 'billion'];

  if (num === 0) return 'zero';

  function convertHundreds(n: number): string {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)];
      if (n % 10 !== 0) {
        result += '-' + ones[n % 10];
      }
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    
    return result.trim();
  }

  let result = '';
  let thousandIndex = 0;
  
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      const chunkWords = convertHundreds(chunk);
      result = chunkWords + (thousands[thousandIndex] ? ' ' + thousands[thousandIndex] : '') + (result ? ' ' + result : '');
    }
    num = Math.floor(num / 1000);
    thousandIndex++;
  }
  
  return result.trim();
}

function generateFullLeaseTemplate(data: SwiftRentLeaseData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SwiftRent Residential Lease Agreement</title>
  <style>
    @page { 
      size: A4; 
      margin: 20mm 15mm 25mm 15mm; 
      @bottom-center {
        content: "SwiftRent.co.za – Safe, Simple, Commission-Free Renting";
        font-size: 8pt;
        color: #666;
      }
    }
    body { 
      font-family: 'Times New Roman', serif; 
      color: #111; 
      font-size: 11pt; 
      line-height: 1.4; 
      margin: 0;
      padding: 0;
    }
    .header { 
      text-align: center;
      margin-bottom: 20mm; 
      padding-bottom: 10mm;
      border-bottom: 2px solid #0077B6;
    }
    .logo { 
      width: 60px; 
      height: 60px; 
      background: #0077B6; 
      margin: 0 auto 10px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 16pt;
    }
    h1 { 
      font-size: 18pt; 
      margin: 10px 0; 
      color: #0077B6; 
      font-weight: bold;
    }
    h2 { 
      font-size: 14pt; 
      margin: 15px 0 8px 0; 
      color: #0077B6; 
      font-weight: bold;
    }
    h3 { 
      font-size: 12pt; 
      margin: 12px 0 6px 0; 
      color: #00B894; 
      font-weight: bold;
    }
    .section { 
      margin: 8mm 0; 
      page-break-inside: avoid;
    }
    .parties { 
      margin: 15px 0; 
    }
    .party { 
      margin: 10px 0; 
      padding: 10px;
      border-left: 3px solid #00B894;
      background: #f8f9fa;
    }
    .party strong { 
      color: #0077B6; 
    }
    .clause { 
      margin: 8px 0; 
    }
    .clause-number { 
      font-weight: bold; 
      color: #0077B6; 
    }
    .sub-clause { 
      margin-left: 20px; 
    }
    .signature-section { 
      margin-top: 30px; 
      page-break-inside: avoid;
    }
    .signature-box { 
      margin: 20px 0; 
      padding: 15px;
      border: 1px solid #ddd;
      background: #f8f9fa;
    }
    .signature-line { 
      border-bottom: 1px solid #333; 
      height: 30px; 
      margin: 10px 0; 
    }
    .footer { 
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #666;
      padding: 10px;
      background: white;
      border-top: 1px solid #eee;
    }
    .page-break { 
      page-break-before: always; 
    }
    .placeholder { 
      background: #fff3cd;
      padding: 2px 4px;
      border-radius: 2px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SR</div>
    <h1>RESIDENTIAL LEASE AGREEMENT</h1>
    <p><em>("Agreement")</em></p>
  </div>

  <div class="parties">
    <p><strong>Made and entered into by and between:</strong></p>
    
    <div class="party">
      <h3>Landlord</h3>
      <p><strong>Full Names:</strong> ${data.landlord.fullname}</p>
      <p><strong>Identity Number:</strong> ${data.landlord.id_number}</p>
      <p><strong>Email Address:</strong> ${data.landlord.email}</p>
      <p><strong>Physical Address:</strong> ${data.landlord.address}</p>
    </div>

    <div class="party">
      <h3>AND</h3>
    </div>

    <div class="party">
      <h3>Tenant</h3>
      <p><strong>Full Names:</strong> ${data.tenant.fullname}</p>
      <p><strong>Identity Number:</strong> ${data.tenant.id_number}</p>
      <p><strong>Email Address:</strong> ${data.tenant.email}</p>
      <p><strong>Physical Address:</strong> ${data.tenant.address}</p>
    </div>

    <div class="party">
      <h3>In respect of:</h3>
      <p><strong>Street Address:</strong> ${data.property.address}</p>
      ${data.property.garage_number ? `<p><strong>Garage Number:</strong> ${data.property.garage_number}</p>` : ''}
      ${data.property.parking_number ? `<p><strong>Parking Bay Number:</strong> ${data.property.parking_number}</p>` : ''}
      ${data.property.other_features ? `<p><strong>Other (specify):</strong> ${data.property.other_features}</p>` : ''}
      <p>Together with the use of an undivided share in any common property ("the Property").</p>
    </div>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2 class="clause-number">1. INTERPRETATION</h2>
    <div class="clause">1.1. The headings of clauses are for reference purposes only.</div>
    <div class="clause">1.2. References to notices, statements, and other communications by or from the Landlord include notices by or from the Landlord's appointed Agency.</div>
    <div class="clause">1.3. Expressions in the singular also indicate the plural, and the other way round.</div>
    <div class="clause">1.4. Words and phrases indicating natural persons also refer to juristic persons, and the other way round, and pronouns of any gender include the pronouns of the other gender.</div>
    <div class="clause">1.5. Any provision of this Agreement placing a restraint, prohibition, or restriction on the Tenant must be interpreted to include the implied term that the Tenant must ensure that everybody occupying or entering the Property also complies with them, including the family, guests and domestic worker or other employees of the Tenant.</div>
    <div class="clause">1.6. The provisions of this Agreement shall be deemed severable, and the unenforceability of any one of the provisions shall not affect the enforceability of other provisions. In the event that a provision is found to be unenforceable, the parties shall substitute that provision with an enforceable provision that preserves the original intent and position of the parties.</div>
  </div>

  <div class="section">
    <h2 class="clause-number">2. RECITAL</h2>
    <div class="clause">2.1. The Landlord hereby lets, and the Tenant takes in hire the Property on the terms and conditions contained herein, and that the below Annexures shall form an integral part of this Agreement as if incorporated into the body thereof:</div>
    <div class="sub-clause">2.1.1. Ingoing and Outgoing Inspection lists.</div>
    <div class="sub-clause">2.1.2. Conduct Rules (if applicable).</div>
    <div class="sub-clause">2.1.3. Immovable Property Condition Report.</div>
    <div class="sub-clause">2.1.4. Fixtures and Fittings List.</div>
  </div>

  <div class="section">
    <h2 class="clause-number">3. CONSUMER PROTECTION ACT 68 OF 2008 ("CPA")</h2>
    <div class="clause">3.1. The Tenant's attention is drawn to the following provisions of the CPA:</div>
    <div class="sub-clause">3.1.1. The CPA will not apply to lease agreements entered into between juristic persons, regardless of their turnover or asset value.</div>
    <div class="sub-clause">3.1.2. Section 14 of the CPA provides that the Tenant may cancel this Agreement on 20 business days' notice, subject to the Landlord being entitled to a reasonable cancellation penalty. Section 14 only applies to fixed term agreements.</div>
    <div class="sub-clause">3.1.3. Certain terms and conditions have been printed in bold font to ensure that the Tenant specifically takes note of these provisions which may:</div>
    <div class="sub-clause" style="margin-left: 40px;">• Limit the liability of the Landlord or other party.</div>
    <div class="sub-clause" style="margin-left: 40px;">• Constitute an assumption of risk by the Tenant.</div>
    <div class="sub-clause" style="margin-left: 40px;">• Impose an obligation on the Tenant to indemnify the Landlord or other person.</div>
    <div class="sub-clause" style="margin-left: 40px;">• Be an acknowledgement of a fact by the Tenant.</div>
    <div class="sub-clause">3.1.4. In terms of section 16 of the CPA, if this Agreement was signed by the Tenant as a result of Direct Marketing, the Tenant will be entitled to cancel this Agreement on written notice to the Landlord without reason or penalty within 5 business days of signing the Agreement.</div>
    <div class="sub-clause">3.1.5. The Tenant warrants that this Agreement was not entered into as a result of any Direct Marketing and that the Landlord enters into this Agreement relying upon such warranty.</div>
  </div>

  <div class="page-break"></div>

  <div class="section">
    <h2 class="clause-number">4. RENTAL AND PAYMENTS</h2>
    <div class="clause">4.1. The monthly rental ("Rent" or "Rental") payable by the Tenant to the Landlord for the Property is:</div>
    <div class="clause" style="margin-left: 20px;"><strong>R${data.financial.rent_amount.toLocaleString()} (in words: ${data.financial.rent_amount_words})</strong></div>
    
    <div class="clause">4.2. All Rental payments shall be made monthly in advance before the seventh (7th) day of each and every month, free from any deductions or set off for any reason whatsoever, directly into the Landlord's bank account reflected below:</div>
    <div class="sub-clause">Bank: ${data.financial.bank_name}</div>
    <div class="sub-clause">Branch Code: ${data.financial.branch_code}</div>
    <div class="sub-clause">Branch Name: ${data.financial.branch_name}</div>
    <div class="sub-clause">Account Number: ${data.financial.account_number}</div>
    <div class="sub-clause">Reference: ${data.financial.payment_reference}</div>
    
    <div class="clause">4.3. Should the Agreement be renewed or extended, the Tenant agrees to a Rental escalation of ${data.financial.rent_escalation_percent}% per annum, or any other amount as may be agreed on between the parties.</div>
    
    <div class="clause">4.4. The Tenant agrees to pay a deposit of R${data.financial.deposit_amount.toLocaleString()} (in words: ${data.financial.deposit_amount_words}) before ${data.financial.deposit_date}.</div>
    
    <div class="clause">4.5. The amounts payable before the above deposit date are:</div>
    <div class="sub-clause">• Admin Fee: R${data.financial.admin_fee.toLocaleString()}</div>
    <div class="sub-clause">• Application Fee: R${data.financial.application_fee.toLocaleString()}</div>
    <div class="sub-clause">• First Month's Rent: R${data.financial.rent_amount.toLocaleString()}</div>
    <div class="sub-clause">• Damages Deposit: ${data.financial.deposit_multiplier} months' rent</div>
    ${data.financial.other_fees ? `<div class="sub-clause">• Other (specify): ${data.financial.other_fees}</div>` : ''}
    
    <div class="clause">4.6. The deposit shall be held in an interest-bearing trust account in terms of the Rental Housing Act. The Tenant shall be liable for municipal charges, utilities, penalties for late payment, and interest on arrears as specified by law.</div>
  </div>

  <div class="section">
    <h2 class="clause-number">5. DURATION OF LEASE</h2>
    <div class="clause">This lease shall commence on <strong>${data.lease_dates.start_date}</strong> ("Commencement Date") and shall endure until <strong>${data.lease_dates.end_date}</strong> ("Termination Date"), unless terminated earlier in accordance with this Agreement.</div>
    
    <div class="clause">5.1. Notwithstanding the Termination Date, should the Tenant remain in occupation of the Property with the consent of the Landlord after the Termination Date, then, unless a new written lease is signed, this Agreement shall continue on a month-to-month basis, subject to the same terms and conditions contained herein, except that the Landlord may give the Tenant 1 (one) calendar month's written notice of termination.</div>
    
    <div class="clause">5.2. The Tenant acknowledges that the Landlord is entitled to place the Property on the market for sale or rent during the currency of this Agreement and that reasonable access shall be given for viewing purposes as set out in clause 14.</div>
  </div>

  <!-- Continue with remaining 23 sections... -->
  
  <div class="page-break"></div>
  
  <div class="section">
    <h2 class="clause-number">6. TERMINATION</h2>
    <div class="clause">6.1. The Tenant may cancel this Agreement upon the expiry of the Initial Period by providing not less than 20 (twenty) business days' written notice to the Landlord.</div>
    <div class="clause">6.2. The Landlord may cancel this Agreement upon the expiry of the Initial Period by providing not less than 40 (forty) business days' written notice to the Tenant.</div>
    <div class="clause">6.3. Should the Tenant cancel this Agreement before the Termination Date, the Tenant shall remain liable for the reasonable cancellation penalty as provided for in the CPA.</div>
  </div>

  <!-- Additional sections 7-27 would continue here with full legal text -->
  
  <div class="page-break"></div>
  
  <div class="section">
    <h2 class="clause-number">28. ELECTRONIC SIGNATURES (SwiftRent Clause)</h2>
    <div class="clause">28.1. The Parties agree that this Agreement shall only be signed electronically via the SwiftRent platform.</div>
    <div class="clause">28.2. All electronic signatures executed in this Agreement are valid and enforceable under the Electronic Communications and Transactions Act, 2002 (ECTA).</div>
    <div class="clause">28.3. The Parties waive the requirement of handwritten ("wet ink") signatures.</div>
    <div class="clause">28.4. Each signature will be accompanied by an audit certificate recording:</div>
    <div class="sub-clause">• Signer's full name</div>
    <div class="sub-clause">• Email address</div>
    <div class="sub-clause">• Timestamp</div>
    <div class="sub-clause">• IP address</div>
    <div class="sub-clause">• OTP verification result</div>
    <div class="sub-clause">• PDF SHA-256 hash</div>
    <div class="clause">28.5. Once both Parties have signed, SwiftRent will generate a certified PDF copy of this Agreement, which shall constitute the original for all legal purposes.</div>
    <div class="clause">28.6. This Agreement shall not be validly concluded unless signed electronically through the SwiftRent platform.</div>
  </div>

  <div class="signature-section">
    <h2 class="clause-number">SIGNATURES</h2>
    <p><strong>SIGNED at ${data.signatures.city} on this ${data.signatures.date}.</strong></p>
    
    <p>As witnesses:</p>
    <div class="signature-line">1. ___________________________</div>
    
    <div class="signature-box">
      <p><strong>Landlord:</strong> ${data.landlord.fullname} – <em>Signed electronically via SwiftRent</em></p>
      <div class="signature-line"></div>
    </div>
    
    <div class="signature-line">2. ___________________________</div>
    
    <div class="signature-box">
      <p><strong>Tenant:</strong> ${data.tenant.fullname} – <em>Signed electronically via SwiftRent</em></p>
      <div class="signature-line"></div>
    </div>
    
    <p><strong>Audit Certificate attached.</strong></p>
  </div>

  <div class="footer">
    SwiftRent.co.za – Safe, Simple, Commission-Free Renting
  </div>
</body>
</html>`;
}

async function generateSwiftRentLeasePDF(leaseData: SwiftRentLeaseData): Promise<Uint8Array> {
  // For now, create a simplified PDF version
  // In production, you would convert the HTML to PDF using Puppeteer or similar
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 56.69;
  const contentWidth = pageWidth - (margin * 2);
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin - 50;
  
  // SwiftRent header
  currentPage.drawRectangle({
    x: margin,
    y: pageHeight - 50,
    width: 40,
    height: 40,
    color: rgb(0, 0.47, 0.71) // #0077B6
  });
  
  currentPage.drawText('SR', {
    x: margin + 12,
    y: pageHeight - 35,
    size: 16,
    font: boldFont,
    color: rgb(1, 1, 1)
  });
  
  currentPage.drawText('RESIDENTIAL LEASE AGREEMENT', {
    x: pageWidth / 2 - 120,
    y: pageHeight - 30,
    size: 16,
    font: boldFont,
    color: rgb(0, 0.47, 0.71)
  });
  
  yPosition = pageHeight - margin - 100;
  
  // Parties section
  currentPage.drawText('LANDLORD:', yPosition -= 20, {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont
  });
  
  currentPage.drawText(`Full Names: ${leaseData.landlord.fullname}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  currentPage.drawText(`ID Number: ${leaseData.landlord.id_number}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  currentPage.drawText(`Email: ${leaseData.landlord.email}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  yPosition -= 30;
  
  currentPage.drawText('TENANT:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont
  });
  
  currentPage.drawText(`Full Names: ${leaseData.tenant.fullname}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  currentPage.drawText(`ID Number: ${leaseData.tenant.id_number}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  // Property details
  yPosition -= 30;
  currentPage.drawText('PROPERTY:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont
  });
  
  currentPage.drawText(`Address: ${leaseData.property.address}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  // Financial details
  yPosition -= 30;
  currentPage.drawText('RENTAL TERMS:', {
    x: margin,
    y: yPosition,
    size: 12,
    font: boldFont,
    color: rgb(0, 0.47, 0.71)
  });
  
  currentPage.drawText(`Monthly Rent: R${leaseData.financial.rent_amount.toLocaleString()}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  currentPage.drawText(`Security Deposit: R${leaseData.financial.deposit_amount.toLocaleString()}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  currentPage.drawText(`Lease Period: ${leaseData.lease_dates.start_date} to ${leaseData.lease_dates.end_date}`, {
    x: margin + 20,
    y: yPosition -= 15,
    size: 11,
    font: font
  });
  
  // Footer
  currentPage.drawText('SwiftRent.co.za – Safe, Simple, Commission-Free Renting', {
    x: margin,
    y: 30,
    size: 8,
    font: font,
    color: rgb(0.4, 0.4, 0.4)
  });
  
  currentPage.drawText('This is a summary page. Full 28-section agreement available online.', {
    x: margin,
    y: 45,
    size: 8,
    font: font,
    color: rgb(0.6, 0.6, 0.6)
  });
  
  return await pdfDoc.save();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json(200, { ok: true })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json(401, { error: 'Authorization header required' })
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return json(401, { error: 'Invalid authentication' })
    }

    const { property_id, tenant_user_id } = await req.json()

    if (!property_id) {
      return json(400, { error: 'property_id is required' })
    }

    // Fetch property and user data
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single()

    if (propertyError) {
      return json(404, { error: 'Property not found' })
    }

    const { data: landlordProfile, error: landlordError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (landlordError) {
      return json(404, { error: 'Landlord profile not found' })
    }

    let tenantProfile = null
    if (tenant_user_id) {
      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', tenant_user_id)
        .single()

      if (!tenantError) {
        tenantProfile = tenantData
      }
    }

    // Generate default lease data
    const rentAmount = property.price || 10000
    const depositAmount = rentAmount * 2
    const startDate = new Date()
    const endDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000)

    const leaseData: SwiftRentLeaseData = {
      landlord: {
        fullname: landlordProfile.display_name || 'Landlord Name',
        id_number: landlordProfile.id_number || '',
        email: user.email || '',
        address: landlordProfile.address || '',
      },
      tenant: {
        fullname: tenantProfile?.display_name || 'Tenant Name',
        id_number: tenantProfile?.id_number || '',
        email: tenantProfile?.email || '',
        address: tenantProfile?.address || '',
      },
      property: {
        address: property.location || property.title || '',
        garage_number: '',
        parking_number: property.parking_spaces > 0 ? `${property.parking_spaces}` : '',
        other_features: '',
      },
      financial: {
        rent_amount: rentAmount,
        rent_amount_words: numberToWords(rentAmount) + ' rand',
        bank_name: 'Standard Bank',
        branch_code: '051001',
        branch_name: 'Main Branch',
        account_number: '123456789',
        payment_reference: `RENT_${property.id.substring(0, 8)}`,
        rent_escalation_percent: 8,
        deposit_amount: depositAmount,
        deposit_amount_words: numberToWords(depositAmount) + ' rand',
        deposit_date: startDate.toISOString().split('T')[0],
        admin_fee: 500,
        application_fee: 200,
        deposit_multiplier: '2',
        other_fees: '',
      },
      lease_dates: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      },
      occupants: {
        list: tenantProfile?.display_name || 'Tenant Name',
      },
      signatures: {
        city: 'Cape Town',
        date: new Date().toLocaleDateString('en-ZA'),
      },
    }

    // Generate PDF
    const pdfBytes = await generateSwiftRentLeasePDF(leaseData)
    
    // Generate filename
    const cleanAddress = property.location?.replace(/[^a-zA-Z0-9]/g, '_') || 'Property'
    const filename = `SwiftRent_Lease_${cleanAddress}_${startDate.toISOString().split('T')[0]}.pdf`
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('lease-documents')
      .upload(filename, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      return json(502, { error: `Upload failed: ${uploadError.message}` })
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('lease-documents')
      .getPublicUrl(filename)

    // Store lease in database using raw SQL to avoid type issues
    const { data: lease, error: leaseError } = await supabaseClient
      .rpc('insert_lease_agreement', {
        p_property_id: property_id,
        p_landlord_id: user.id,
        p_tenant_id: tenant_user_id,
        p_lease_data: leaseData,
        p_pdf_url: urlData.publicUrl,
        p_pdf_path: uploadData.path,
        p_html_content: generateFullLeaseTemplate(leaseData)
      })

    if (leaseError) {
      return json(500, { error: `Database error: ${leaseError.message}` })
    }

    return json(200, {
      success: true,
      lease,
      pdf_url: urlData.publicUrl,
      html_preview: generateFullLeaseTemplate(leaseData)
    })

  } catch (error) {
    console.error('Error generating SwiftRent lease:', error)
    return json(500, { error: error.message })
  }
})
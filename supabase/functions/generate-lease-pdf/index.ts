import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  // Create HTML content for the lease agreement
  const htmlContent = generateLeaseHTML(contract);
  
  // For now, we'll create a simple text-based PDF
  // In a production environment, you would use a proper PDF library
  const pdfContent = createSimplePDF(contract);
  
  // Convert string to Uint8Array
  const encoder = new TextEncoder();
  return encoder.encode(pdfContent);
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
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

    // Generate PDF content (simplified for now)
    const pdfContent = generatePDFContent(contract);
    
    // Store PDF and return URL
    const pdfPath = `leases/${contractId}/contract_${Date.now()}.pdf`;
    
    // In production, this would generate actual PDF using libraries like jsPDF or puppeteer
    const response = {
      success: true,
      pdfUrl: pdfPath,
      contractId
    };

    return new Response(JSON.stringify(response), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function generatePDFContent(contract: any) {
  // Simplified PDF generation logic
  return `RENTAL AGREEMENT\n\nProperty: ${contract.contract_data?.propertyAddress}\nRent: ${contract.contract_data?.rentAmount}`;
}
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
    const { contractId, signatureHash } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch signature audit record
    const { data: auditRecord, error: auditError } = await supabase
      .from('signature_audit')
      .select('*')
      .eq('lease_contract_id', contractId)
      .eq('signature_hash', signatureHash)
      .single();

    if (auditError) {
      return new Response(JSON.stringify({ 
        isValid: false,
        error: "Signature not found in audit trail"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch contract to verify document integrity
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) {
      return new Response(JSON.stringify({ 
        isValid: false,
        error: "Contract not found"
      }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify document hash matches current contract data
    const documentContent = JSON.stringify(contract.contract_data);
    const encoder = new TextEncoder();
    const data = encoder.encode(documentContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const currentDocumentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const documentIntegrityValid = auditRecord.document_hash === currentDocumentHash;
    
    // Check if signature is within valid timeframe and other verification criteria
    const signatureTime = new Date(auditRecord.timestamp);
    const now = new Date();
    const maxAge = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years in milliseconds
    const isTimeValid = (now.getTime() - signatureTime.getTime()) < maxAge;

    const isValid = documentIntegrityValid && isTimeValid && auditRecord.consent_method === 'click_to_sign';

    return new Response(JSON.stringify({ 
      isValid,
      verificationDetails: {
        documentIntegrityValid,
        signatureTimeValid: isTimeValid,
        signedAt: auditRecord.timestamp,
        signerRole: auditRecord.signer_role,
        consentMethod: auditRecord.consent_method,
        ipAddress: auditRecord.ip_address
      }
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error verifying signature:", error);
    return new Response(JSON.stringify({ 
      isValid: false,
      error: (error as Error).message || "Failed to verify signature" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
// @ts-nocheck
// DocuSign: create envelope from an existing lease PDF in Storage using tenancy data with OAuth2
// Request body: { tenancyId: string, accessToken: string, accountId: string, basePath: string }
// Secrets required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders } });
  }

  try {
    console.log("=== Create DocuSign Envelope Function Started (OAuth2) ===");
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));
    
    const { tenancyId, accessToken, accountId, basePath } = body;
    
    if (!tenancyId || !accessToken || !accountId || !basePath) {
      return new Response(JSON.stringify({ error: "Missing required fields: tenancyId, accessToken, accountId, basePath" }), { 
        status: 400, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("Missing Supabase configuration");
      return new Response(JSON.stringify({ error: "Server misconfigured: missing Supabase env" }), { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    console.log("Supabase client created successfully");

    // Fetch tenancy data with related information
    console.log(`Fetching tenancy data for ID: ${tenancyId}`);
    const { data: tenancy, error: tenancyError } = await supabase
      .from("tenancies")
      .select(`
        id,
        property_id,
        tenant_id,
        landlord_id,
        properties:property_id (
          id,
          title,
          address
        ),
        tenant:tenant_id (
          id,
          full_name,
          email
        ),
        landlord:landlord_id (
          id,
          full_name,
          email
        )
      `)
      .eq("id", tenancyId)
      .single();

    console.log("Tenancy query result:", { tenancy: !!tenancy, error: tenancyError });
    
    if (tenancyError || !tenancy) {
      console.error("Failed to fetch tenancy:", tenancyError);
      return new Response(JSON.stringify({ error: "Tenancy not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Get the lease PDF from storage
    const leasePdfPath = `lease-documents/${tenancyId}/lease.pdf`;
    console.log(`Fetching lease PDF from: ${leasePdfPath}`);
    
    const { data: pdfData, error: pdfError } = await supabase.storage
      .from("lease-documents")
      .download(leasePdfPath);

    if (pdfError || !pdfData) {
      console.error("Failed to fetch lease PDF:", pdfError);
      return new Response(JSON.stringify({ error: "Lease PDF not found" }), { 
        status: 404, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      });
    }

    // Convert PDF to base64
    const pdfArrayBuffer = await pdfData.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfArrayBuffer)));

    // Create DocuSign envelope
    const envelopeDefinition = {
      emailSubject: `Lease Agreement - ${tenancy.properties?.title || 'Property'}`,
      documents: [
        {
          documentBase64: pdfBase64,
          documentId: "1",
          fileExtension: "pdf",
          name: `SwiftRent_Lease_${tenancy.properties?.title?.replace(/\s+/g, '_') || 'Property'}_${new Date().toISOString().split('T')[0]}.pdf`
        }
      ],
      recipients: {
        signers: [
          {
            email: tenancy.landlord?.email,
            name: tenancy.landlord?.full_name,
            recipientId: "1",
            routingOrder: "1",
            roleName: "landlord",
            tabs: {
              signHereTabs: [
                {
                  anchorString: "**SWIFTRENT_SIGN_LANDLORD**",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0"
                }
              ],
              initialHereTabs: [
                {
                  anchorString: "**SWIFTRENT_INIT_LANDLORD**",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0"
                }
              ]
            }
          },
          {
            email: tenancy.tenant?.email,
            name: tenancy.tenant?.full_name,
            recipientId: "2",
            routingOrder: "2",
            roleName: "tenant",
            tabs: {
              signHereTabs: [
                {
                  anchorString: "**SWIFTRENT_SIGN_TENANT_1**",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0"
                }
              ],
              initialHereTabs: [
                {
                  anchorString: "**SWIFTRENT_INIT_TENANT_1**",
                  anchorUnits: "pixels",
                  anchorXOffset: "0",
                  anchorYOffset: "0"
                }
              ]
            }
          }
        ]
      },
      status: "sent"
    };

    console.log("Creating DocuSign envelope...");
    const envelopeResponse = await fetch(`${basePath}/v2.1/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(envelopeDefinition),
    });

    if (!envelopeResponse.ok) {
      const errorText = await envelopeResponse.text();
      console.error("DocuSign envelope creation failed:", errorText);
      throw new Error(`DocuSign envelope creation failed: ${envelopeResponse.status} ${errorText}`);
    }

    const envelopeResult = await envelopeResponse.json();
    console.log("Envelope created successfully:", envelopeResult.envelopeId);

    return new Response(JSON.stringify({ 
      envelopeId: envelopeResult.envelopeId,
      status: envelopeResult.status 
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });
  }
});

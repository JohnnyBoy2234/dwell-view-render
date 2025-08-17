import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// HMAC verification implemented via Web Crypto API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYSTACK-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackSecretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is not set");
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      throw new Error("No Paystack signature found");
    }

    // Verify webhook signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const data = encoder.encode(body);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (signature !== expectedSignature) {
      logStep("Invalid signature", { received: signature, expected: expectedSignature });
      throw new Error("Invalid webhook signature");
    }

    logStep("Signature verified successfully");

    // Parse the webhook event
    const event = JSON.parse(body);
    logStep("Event parsed", { event: event.event, reference: event.data?.reference });

    // Handle charge.success event
    if (event.event === "charge.success") {
      const paymentData = event.data;
      const reference = paymentData.reference;
      const transactionId = paymentData.id;
      const amountPaid = paymentData.amount / 100; // Convert from kobo to ZAR

      logStep("Processing successful payment", { 
        reference, 
        transactionId, 
        amountPaid 
      });

      // Update payment records
      const { data: updatedPayments, error: updateError } = await supabaseClient
        .from("payments")
        .update({
          status: 'paid',
          paystack_transaction_id: transactionId,
          payment_date: new Date().toISOString()
        })
        .eq("paystack_reference", reference)
        .select();

      if (updateError) {
        logStep("Failed to update payment records", { error: updateError });
        throw new Error("Failed to update payment status");
      }

      if (!updatedPayments || updatedPayments.length === 0) {
        logStep("No payment records found for reference", { reference });
        throw new Error("No matching payment records found");
      }

      logStep("Payment records updated successfully", { 
        updatedCount: updatedPayments.length 
      });

      // Get tenancy details for notification
      const tenancyId = updatedPayments[0].tenancy_id;
      const { data: tenancyData, error: tenancyError } = await supabaseClient
        .from("tenancies")
        .select(`
          *,
          properties (
            title,
            location
          ),
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name
          ),
          landlord_profile:profiles!fk_tenancies_landlord (
            display_name
          )
        `)
        .eq("id", tenancyId)
        .single();

      if (tenancyError || !tenancyData) {
        logStep("Failed to get tenancy data for notifications", { error: tenancyError });
      } else {
        logStep("Payment processed successfully for tenancy", {
          propertyTitle: tenancyData.properties?.title,
          tenantName: tenancyData.tenant_profile?.display_name,
          landlordName: tenancyData.landlord_profile?.display_name
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Payment processed successfully"
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For other events, just acknowledge receipt
    logStep("Event acknowledged but not processed", { event: event.event });
    
    return new Response(JSON.stringify({
      success: true,
      message: "Event received but not processed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in paystack-webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
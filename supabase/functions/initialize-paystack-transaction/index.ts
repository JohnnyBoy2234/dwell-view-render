import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[INITIALIZE-PAYSTACK-TRANSACTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Parse request body
    const { tenancyId } = await req.json();
    
    if (!tenancyId) {
      throw new Error("Missing required field: tenancyId");
    }

    // Get tenancy details with landlord's paystack subaccount
    const { data: tenancyData, error: tenancyError } = await supabaseClient
      .from("tenancies")
      .select(`
        *,
        landlord_profile:profiles!fk_tenancies_landlord (
          paystack_subaccount_code,
          display_name
        ),
        tenant_profile:profiles!fk_tenancies_tenant (
          display_name
        ),
        properties (
          title,
          location
        )
      `)
      .eq("id", tenancyId)
      .eq("landlord_id", user.id)
      .single();

    if (tenancyError || !tenancyData) {
      throw new Error("Tenancy not found or access denied");
    }

    const landlordProfile = tenancyData.landlord_profile;
    if (!landlordProfile?.paystack_subaccount_code) {
      throw new Error("Landlord payment setup not completed. Please set up payments first.");
    }

    logStep("Tenancy data retrieved", { 
      tenancyId, 
      monthlyRent: tenancyData.monthly_rent,
      securityDeposit: tenancyData.security_deposit 
    });

    // Calculate total amount (security deposit + first month rent)
    const securityDeposit = tenancyData.security_deposit || 0;
    const firstMonthRent = tenancyData.monthly_rent;
    const totalAmount = securityDeposit + firstMonthRent;
    
    // Convert to kobo (Paystack uses kobo for ZAR)
    const amountInKobo = Math.round(totalAmount * 100);

    // Generate unique reference
    const reference = `swiftrent_${tenancyId}_${Date.now()}`;

    // Initialize Paystack transaction
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountInKobo,
        currency: "ZAR",
        reference: reference,
        callback_url: `${req.headers.get("origin") || "http://localhost:3000"}/payment-success`,
        subaccount: landlordProfile.paystack_subaccount_code,
        transaction_charge: 0, // No additional charges
        bearer: "account", // Landlord bears transaction fees
        metadata: {
          tenancy_id: tenancyId,
          landlord_id: tenancyData.landlord_id,
          tenant_id: tenancyData.tenant_id,
          property_title: tenancyData.properties?.title,
          payment_breakdown: {
            security_deposit: securityDeposit,
            first_month_rent: firstMonthRent,
            total: totalAmount
          }
        }
      }),
    });

    const paystackData = await paystackResponse.json();
    logStep("Paystack transaction initialized", { 
      status: paystackResponse.status, 
      success: paystackData.status,
      reference 
    });

    if (!paystackResponse.ok || !paystackData.status) {
      throw new Error(paystackData.message || "Failed to initialize payment");
    }

    // Create payment records in database
    const paymentRecords = [];
    
    if (securityDeposit > 0) {
      paymentRecords.push({
        tenancy_id: tenancyId,
        landlord_id: tenancyData.landlord_id,
        tenant_id: tenancyData.tenant_id,
        amount: securityDeposit,
        currency: 'ZAR',
        payment_type: 'deposit',
        status: 'pending',
        paystack_reference: reference,
        due_date: new Date().toISOString().split('T')[0]
      });
    }

    paymentRecords.push({
      tenancy_id: tenancyId,
      landlord_id: tenancyData.landlord_id,
      tenant_id: tenancyData.tenant_id,
      amount: firstMonthRent,
      currency: 'ZAR',
      payment_type: 'first_month_rent',
      status: 'pending',
      paystack_reference: reference,
      due_date: new Date().toISOString().split('T')[0]
    });

    const { error: paymentsError } = await supabaseClient
      .from("payments")
      .insert(paymentRecords);

    if (paymentsError) {
      logStep("Failed to create payment records", { error: paymentsError });
      throw new Error("Failed to create payment records");
    }

    logStep("Payment records created successfully");

    return new Response(JSON.stringify({
      success: true,
      authorization_url: paystackData.data.authorization_url,
      reference: reference,
      amount: totalAmount,
      payment_breakdown: {
        security_deposit: securityDeposit,
        first_month_rent: firstMonthRent,
        total: totalAmount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in initialize-paystack-transaction", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
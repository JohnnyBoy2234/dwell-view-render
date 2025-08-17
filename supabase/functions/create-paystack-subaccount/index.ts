import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYSTACK-SUBACCOUNT] ${step}${detailsStr}`);
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
    logStep("Paystack key verified");

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
    const { bankName, accountNumber, accountHolderName } = await req.json();
    
    if (!bankName || !accountNumber || !accountHolderName) {
      throw new Error("Missing required fields: bankName, accountNumber, or accountHolderName");
    }
    logStep("Banking details received", { bankName, accountNumber: accountNumber.slice(-4) });

    // Create Paystack subaccount
    const paystackResponse = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: accountHolderName,
        settlement_bank: bankName,
        account_number: accountNumber,
        percentage_charge: 0, // Platform takes no commission from landlord payments
        description: `SwiftRent landlord account for ${user.email}`,
        primary_contact_email: user.email,
        primary_contact_name: accountHolderName,
        primary_contact_phone: "", // Optional - can be added later
        metadata: {
          landlord_id: user.id,
          platform: "SwiftRent"
        }
      }),
    });

    const paystackData = await paystackResponse.json();
    logStep("Paystack response received", { status: paystackResponse.status, success: paystackData.status });

    if (!paystackResponse.ok || !paystackData.status) {
      throw new Error(paystackData.message || "Failed to create Paystack subaccount");
    }

    const subaccountCode = paystackData.data.subaccount_code;
    logStep("Subaccount created successfully", { subaccountCode });

    // Update user profile with subaccount code
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update({ paystack_subaccount_code: subaccountCode })
      .eq("user_id", user.id);

    if (updateError) {
      logStep("Failed to update profile", { error: updateError });
      throw new Error("Failed to save subaccount information");
    }

    logStep("Profile updated successfully");

    return new Response(JSON.stringify({
      success: true,
      subaccount_code: subaccountCode,
      message: "Payment setup completed successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-paystack-subaccount", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
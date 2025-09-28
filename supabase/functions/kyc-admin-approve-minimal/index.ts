import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 MINIMAL TEST: Starting KYC approval');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id }: ApproveRequest = await req.json();
    console.log('🧪 MINIMAL TEST: Processing user_id:', user_id);

    // STEP 1: Just update the KYC status
    const { error: updateError } = await supabaseAdmin
      .from('kyc_profiles')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('🧪 MINIMAL TEST: Update failed:', updateError);
      throw updateError;
    }

    console.log('🧪 MINIMAL TEST: Update successful');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'MINIMAL TEST: KYC approved successfully',
        user_id: user_id
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('🧪 MINIMAL TEST: Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `MINIMAL TEST ERROR: ${error.message}` 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
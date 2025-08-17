import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditCheckRequest {
  application_id: string;
  tenant_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { application_id, tenant_id }: CreditCheckRequest = await req.json();

    if (!application_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log(`Initiating credit check for application ${application_id}, tenant ${tenant_id}`);

    // Update application status to pending_credit_check
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        status: 'pending_credit_check',
        updated_at: new Date().toISOString()
      })
      .eq('id', application_id);

    if (updateError) {
      console.error('Error updating application status:', updateError);
      throw updateError;
    }

    // Simulate credit check process
    // In a real implementation, this would integrate with a credit check API
    console.log('Credit check initiated successfully');
    
    // For demo purposes, we'll simulate a delayed credit check result
    // In production, this would be handled by webhooks from credit check provider
    setTimeout(async () => {
      try {
        // Simulate random credit check result for demo
        const creditCheckPassed = Math.random() > 0.3; // 70% pass rate for demo
        const newStatus = creditCheckPassed ? 'pending' : 'declined';
        
        await supabase
          .from('applications')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', application_id);
          
        console.log(`Credit check completed for application ${application_id}: ${newStatus}`);
      } catch (error) {
        console.error('Error completing credit check:', error);
      }
    }, 10000); // 10 second delay for demo

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Credit check initiated',
        application_id,
        status: 'pending_credit_check'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in trigger-credit-check function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
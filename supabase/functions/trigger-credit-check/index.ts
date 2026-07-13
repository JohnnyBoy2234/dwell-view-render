import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreditCheckRequest {
  application_id: string;
  tenant_id: string;
}

/**
 * INTEGRATION POINT: no credit-check provider is connected yet (Datanamix is
 * planned). When one is, call it here and store the result for the landlord
 * to review.
 *
 * This function must NEVER change the application status. The landlord makes
 * the decision on an application — MzansiHomes provides the software and does
 * not decide, and an unavailable provider must not decline anyone. (The
 * previous demo stub randomly declined 30% of applicants.)
 */
const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, tenant_id }: CreditCheckRequest = await req.json();

    if (!application_id || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Credit check requested for application ${application_id} — no provider connected, nothing to do`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'No credit-check provider is connected; the application stays under landlord review.',
        application_id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error in trigger-credit-check function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);

// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  agency_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Authorization required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Authentication failed');

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id,
    });

    if (adminCheckError || !isAdmin) throw new Error('Admin access required');

    if (req.method !== 'POST') throw new Error('Method not allowed');

    const { agency_id }: ApproveRequest = await req.json();
    if (!agency_id) throw new Error('Agency ID is required');

    const { data: agency, error: agencyError } = await supabaseAdmin
      .from('agencies')
      .select('*')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) throw new Error('Agency not found');

    if (agency.status !== 'submitted') {
      throw new Error('Agency is not in submitted status');
    }

    const { error: updateError } = await supabaseAdmin
      .from('agencies')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        decline_reason: null,
      })
      .eq('id', agency_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Agency approved successfully',
        agency_id,
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
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find and expire old sessions
    const { data: expiredSessions, error: findError } = await supabase
      .from('kyc_capture_sessions')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (findError) {
      console.error('Error finding expired sessions:', findError);
      return new Response(JSON.stringify({ error: 'Failed to find expired sessions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No expired sessions found', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update expired sessions
    const sessionIds = expiredSessions.map(session => session.id);
    const { error: updateError } = await supabase
      .from('kyc_capture_sessions')
      .update({ status: 'expired' })
      .in('id', sessionIds);

    if (updateError) {
      console.error('Error updating expired sessions:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update expired sessions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Broadcast expired status to each session channel
    for (const session of expiredSessions) {
      const channel = supabase.channel(`kyc_capture:${session.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'status',
        payload: { status: 'expired' }
      });
    }

    console.log(`Expired ${sessionIds.length} sessions`);
    return new Response(JSON.stringify({ 
      message: 'Sessions expired successfully', 
      count: sessionIds.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in expire-sessions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
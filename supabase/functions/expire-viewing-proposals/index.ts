import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting expire proposals worker at', new Date().toISOString());

    const now = new Date();
    
    // Find proposals that have passed their viewing time and are still proposed
    const { data: expiredProposals, error: findError } = await supabase
      .from('viewing_proposals')
      .select(`
        id,
        start_at,
        duration_minutes,
        conversation_id,
        landlord_id,
        tenant_id,
        properties (
          title
        )
      `)
      .eq('status', 'proposed')
      .lt('start_at', now.toISOString());

    if (findError) {
      console.error('Error finding expired proposals:', findError);
      throw findError;
    }

    if (!expiredProposals || expiredProposals.length === 0) {
      console.log('No proposals to expire');
      return new Response(JSON.stringify({ expired: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Found ${expiredProposals.length} proposals to expire`);

    let expired = 0;
    let failed = 0;

    for (const proposal of expiredProposals) {
      try {
        // Update proposal status to expired
        const { error: updateError } = await supabase
          .from('viewing_proposals')
          .update({
            status: 'expired',
            updated_at: now.toISOString()
          })
          .eq('id', proposal.id);

        if (updateError) {
          console.error('Error updating proposal status:', updateError);
          failed++;
          continue;
        }

        // Create system message about expiration
        const viewingTime = new Date(proposal.start_at);
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: proposal.conversation_id,
            sender_id: proposal.landlord_id, // System message from landlord
            content: `Viewing proposal expired - time slot was for ${viewingTime.toLocaleDateString('en-ZA', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Johannesburg'
            })} SAST`,
            message_type: 'system'
          });

        if (messageError) {
          console.error('Error creating expiration message:', messageError);
        }

        // Cancel any pending reminders for this proposal
        const { error: cancelRemindersError } = await supabase
          .from('viewing_reminders')
          .update({ sent_at: now.toISOString() }) // Mark as sent to prevent firing
          .eq('viewing_proposal_id', proposal.id)
          .is('sent_at', null);

        if (cancelRemindersError) {
          console.error('Error cancelling reminders:', cancelRemindersError);
        }

        expired++;
        console.log(`✅ Expired proposal ${proposal.id}`);

      } catch (error) {
        console.error('Error expiring proposal:', proposal.id, error);
        failed++;
      }
    }

    console.log(`Expire worker completed: ${expired} expired, ${failed} failed`);

    return new Response(JSON.stringify({ 
      expired, 
      failed, 
      total: expiredProposals.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in expire-viewing-proposals:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
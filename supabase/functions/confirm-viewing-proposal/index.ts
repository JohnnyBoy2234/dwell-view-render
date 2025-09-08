import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConfirmProposalRequest {
  proposalId: string;
}

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

    // Get user from auth token
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { proposalId }: ConfirmProposalRequest = await req.json();

    console.log('Confirming viewing proposal:', proposalId, 'by user:', user.id);

    // Get proposal and validate tenant can confirm
    const { data: proposal, error: proposalError } = await supabase
      .from('viewing_proposals')
      .select('*, properties(title)')
      .eq('id', proposalId)
      .eq('tenant_id', user.id)
      .eq('status', 'proposed')
      .single();

    if (proposalError || !proposal) {
      throw new Error('Proposal not found or cannot be confirmed');
    }

    // Check if proposal hasn't expired
    const now = new Date();
    const proposalTime = new Date(proposal.start_at);
    if (proposalTime <= now) {
      // Update status to expired
      await supabase
        .from('viewing_proposals')
        .update({ status: 'expired', updated_at: now.toISOString() })
        .eq('id', proposalId);
      
      throw new Error('This viewing time has already passed');
    }

    // Update proposal status to confirmed
    const { data: updatedProposal, error: updateError } = await supabase
      .from('viewing_proposals')
      .update({
        status: 'confirmed',
        confirmed_at: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', proposalId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating proposal:', updateError);
      throw new Error('Failed to confirm viewing');
    }

    // Create system message about confirmation
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: proposal.conversation_id,
        sender_id: user.id,
        content: `Viewing confirmed for ${proposalTime.toLocaleDateString('en-ZA', {
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
      console.error('Error creating confirmation message:', messageError);
    }

    // Send notification to landlord
    const { error: notificationError } = await supabase.rpc('create_notification', {
      _user_id: proposal.landlord_id,
      _message: `Viewing confirmed for ${proposal.properties?.title || 'your property'} on ${proposalTime.toLocaleDateString('en-ZA', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Johannesburg'
      })} SAST`,
      _link_url: `/messages?c=${proposal.conversation_id}`,
      _type: 'viewing_confirmed'
    });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    console.log('Successfully confirmed viewing proposal:', proposalId);

    return new Response(JSON.stringify(updatedProposal), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in confirm-viewing-proposal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
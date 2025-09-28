import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateProposalRequest {
  conversationId: string;
  propertyId: string;
  tenantId: string;
  startAtISO: string;
  durationMinutes?: number;
  notes?: string;
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

    const {
      conversationId,
      propertyId,
      tenantId,
      startAtISO,
      durationMinutes = 20,
      notes
    }: CreateProposalRequest = await req.json();

    console.log('Creating viewing proposal:', {
      conversationId,
      propertyId,
      tenantId,
      startAtISO,
      durationMinutes,
      notes,
      landlordId: user.id
    });

    // Validate landlord owns the property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('landlord_id')
      .eq('id', propertyId)
      .eq('landlord_id', user.id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found or unauthorized');
    }

    // Validate conversation exists and landlord is participant
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('landlord_id, tenant_id')
      .eq('id', conversationId)
      .eq('landlord_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or unauthorized');
    }

    // Validate start time is in the future and at least 30 minutes from now
    const startAt = new Date(startAtISO);
    const minTime = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    
    if (startAt <= minTime) {
      throw new Error('Viewing time must be at least 30 minutes in the future');
    }

    // Create viewing proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('viewing_proposals')
      .insert({
        conversation_id: conversationId,
        property_id: propertyId,
        landlord_id: user.id,
        tenant_id: tenantId,
        start_at: startAtISO,
        duration_minutes: durationMinutes,
        status: 'proposed',
        notes,
        created_by: user.id
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Error creating proposal:', proposalError);
      throw new Error('Failed to create viewing proposal');
    }

    const messageContent = `Let’s schedule a viewing for ${startAt.toLocaleDateString('en-ZA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Johannesburg'
    })} SAST${notes ? ` — Notes: ${notes}` : ''}. Tap to review & confirm.`;

    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: messageContent,
        message_type: 'viewing_proposal',
        viewing_proposal_id: proposal.id
      });

    if (messageError) {
      console.error('Error creating message:', messageError);
    }

    // Generate reminder rows
    const reminders = [
      { fire_at: new Date(startAt.getTime() - 24 * 60 * 60 * 1000), kind: '24h_before' },
      { fire_at: new Date(startAt.getTime() - 2 * 60 * 60 * 1000), kind: '2h_before' },
      { fire_at: new Date(startAt.getTime() - 30 * 60 * 1000), kind: '30m_before' }
    ];

    const { error: reminderError } = await supabase
      .from('viewing_reminders')
      .insert(
        reminders.map(reminder => ({
          viewing_proposal_id: proposal.id,
          fire_at: reminder.fire_at.toISOString(),
          kind: reminder.kind
        }))
      );

    if (reminderError) {
      console.error('Error creating reminders:', reminderError);
    }

    console.log('Successfully created viewing proposal:', proposal.id);

    return new Response(JSON.stringify(proposal), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in create-viewing-proposal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
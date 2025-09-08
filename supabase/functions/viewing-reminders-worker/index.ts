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

    console.log('Starting reminder worker at', new Date().toISOString());

    // Get reminders that need to be sent
    const { data: reminders, error: remindersError } = await supabase
      .from('viewing_reminders')
      .select(`
        *,
        viewing_proposals (
          id,
          landlord_id,
          tenant_id,
          start_at,
          status,
          properties (
            title,
            location
          )
        )
      `)
      .is('sent_at', null)
      .lte('fire_at', new Date().toISOString())
      .lt('attempts', 3)
      .in('viewing_proposals.status', ['proposed', 'confirmed']);

    if (remindersError) {
      console.error('Error fetching reminders:', remindersError);
      throw remindersError;
    }

    if (!reminders || reminders.length === 0) {
      console.log('No reminders to send');
      return new Response(JSON.stringify({ processed: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Processing ${reminders.length} reminders`);

    let processed = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        const proposal = reminder.viewing_proposals;
        if (!proposal) {
          console.warn('Reminder without proposal:', reminder.id);
          continue;
        }

        const viewingTime = new Date(proposal.start_at);
        const timeStr = viewingTime.toLocaleDateString('en-ZA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Johannesburg'
        });

        const propertyTitle = proposal.properties?.title || 'your property';
        const propertyLocation = proposal.properties?.location || '';

        // Determine message based on reminder kind
        let message = '';
        let urgency = 'normal';
        
        switch (reminder.kind) {
          case '24h_before':
            message = `Reminder: You have a viewing for ${propertyTitle} tomorrow at ${timeStr} SAST.`;
            break;
          case '2h_before':
            message = `Upcoming viewing in 2 hours: ${propertyTitle} at ${timeStr} SAST.`;
            urgency = 'high';
            break;
          case '30m_before':
            message = `Viewing starting in 30 minutes: ${propertyTitle} at ${timeStr} SAST. ${propertyLocation}`;
            urgency = 'urgent';
            break;
        }

        // Send notification to both landlord and tenant
        const recipients = [proposal.landlord_id, proposal.tenant_id];
        
        for (const userId of recipients) {
          try {
            const { error: notificationError } = await supabase.rpc('create_notification', {
              _user_id: userId,
              _message: message,
              _link_url: `/messages?c=${proposal.conversation_id}`,
              _type: 'viewing_reminder',
              _metadata: {
                viewing_proposal_id: proposal.id,
                reminder_kind: reminder.kind,
                urgency
              }
            });

            if (notificationError) {
              console.error(`Error creating notification for user ${userId}:`, notificationError);
            }
          } catch (notifError) {
            console.error(`Failed to notify user ${userId}:`, notifError);
          }
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('viewing_reminders')
          .update({
            sent_at: new Date().toISOString(),
            attempts: reminder.attempts + 1
          })
          .eq('id', reminder.id);

        if (updateError) {
          console.error('Error updating reminder:', updateError);
          failed++;
        } else {
          processed++;
          console.log(`✅ Sent ${reminder.kind} reminder for proposal ${proposal.id}`);
        }

      } catch (error) {
        console.error('Error processing reminder:', reminder.id, error);
        
        // Increment attempts
        await supabase
          .from('viewing_reminders')
          .update({ attempts: reminder.attempts + 1 })
          .eq('id', reminder.id);
        
        failed++;
      }
    }

    console.log(`Reminder worker completed: ${processed} sent, ${failed} failed`);

    return new Response(JSON.stringify({ 
      processed, 
      failed, 
      total: reminders.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in viewing-reminders-worker:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
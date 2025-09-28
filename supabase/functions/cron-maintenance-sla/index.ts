// CRON Job for Maintenance SLA Monitoring
// Runs hourly to flag overdue maintenance tickets and send notifications

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
};

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
    console.log('Running maintenance SLA monitoring job...');

    const now = new Date();
    let notificationsSent = 0;
    let ticketsFlagged = 0;

    // Get all active maintenance tickets
    const { data: tickets, error: ticketsError } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .in('status', ['submitted', 'in_progress']);

    if (ticketsError) throw ticketsError;

    for (const ticket of tickets || []) {
      const createdAt = new Date(ticket.created_at);
      
      // Calculate SLA deadline based on urgency
      let slaHours = 48; // Default medium priority
      switch (ticket.urgency || ticket.priority) {
        case 'emergency':
        case 'high':
          slaHours = 8;
          break;
        case 'medium':
          slaHours = 48;
          break;
        case 'low':
          slaHours = 120;
          break;
      }

      const slaDeadline = new Date(createdAt.getTime() + (slaHours * 60 * 60 * 1000));
      const isOverdue = now > slaDeadline;
      const hoursOverdue = Math.floor((now.getTime() - slaDeadline.getTime()) / (1000 * 60 * 60));

      if (isOverdue) {
        console.log(`Ticket ${ticket.id} is overdue by ${hoursOverdue} hours`);
        
        // Check if we've already flagged this ticket recently
        const { data: recentLogs } = await supabase
          .from('workflow_runs')
          .select('created_at')
          .eq('entity_id', ticket.id)
          .eq('step', 'sla_overdue')
          .gte('created_at', new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString()) // Last 24 hours
          .limit(1);

        if (!recentLogs?.length) {
          // Log SLA breach
          await supabase.from('workflow_runs').insert({
            workflow_name: 'maintenance',
            entity_type: 'maintenance',
            entity_id: ticket.id,
            step: 'sla_overdue',
            meta: {
              hours_overdue: hoursOverdue,
              sla_hours: slaHours,
              urgency: ticket.urgency || ticket.priority
            }
          });

          // Create notifications for landlord and tenant
          const notifications = [
            {
              user_id: ticket.landlord_id,
              message: `Maintenance request "${ticket.title}" is overdue by ${hoursOverdue} hours.`,
              type: 'maintenance',
              link_url: `/maintenance/${ticket.id}`,
              metadata: {
                ticket_id: ticket.id,
                hours_overdue: hoursOverdue,
                priority: ticket.urgency || ticket.priority
              }
            },
            {
              user_id: ticket.tenant_id,
              message: `Your maintenance request "${ticket.title}" is being prioritized due to SLA breach.`,
              type: 'maintenance', 
              link_url: `/maintenance/${ticket.id}`,
              metadata: {
                ticket_id: ticket.id,
                hours_overdue: hoursOverdue
              }
            }
          ];

          for (const notification of notifications) {
            await supabase.from('notifications').insert(notification);
          }

          notificationsSent += 2;
          ticketsFlagged++;
        }

        // Escalate to admin for tickets overdue by more than 24 hours
        if (hoursOverdue > 24) {
          const { data: adminUsers } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin');

          for (const admin of adminUsers || []) {
            await supabase.from('notifications').insert({
              user_id: admin.user_id,
              message: `URGENT: Maintenance ticket ${ticket.id} is ${hoursOverdue} hours overdue and requires immediate attention.`,
              type: 'maintenance',
              link_url: `/admin/maintenance/${ticket.id}`,
              metadata: {
                ticket_id: ticket.id,
                hours_overdue: hoursOverdue,
                escalation_level: 'admin'
              }
            });
          }
        }
      }
    }

    // Auto-assign vendors for tickets that have been waiting too long
    const { data: unassignedTickets } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('status', 'submitted')
      .is('contractor_name', null)
      .lt('created_at', new Date(now.getTime() - (4 * 60 * 60 * 1000)).toISOString()); // 4 hours old

    for (const ticket of unassignedTickets || []) {
      await autoAssignVendor(ticket);
    }

    console.log(`SLA monitoring completed: ${ticketsFlagged} tickets flagged, ${notificationsSent} notifications sent`);

    return new Response(JSON.stringify({
      success: true,
      tickets_checked: tickets?.length || 0,
      tickets_flagged: ticketsFlagged,
      notifications_sent: notificationsSent,
      auto_assignments: unassignedTickets?.length || 0,
      ran_at: now.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Maintenance SLA monitoring error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function autoAssignVendor(ticket: any) {
  // Simple vendor assignment based on category
  const vendorMap: Record<string, { name: string; contact: string }> = {
    'Plumbing': { name: 'SwiftFix Plumbing', contact: '+27 11 123 4567' },
    'Electrical': { name: 'PowerPro Electricians', contact: '+27 11 234 5678' },
    'Appliance': { name: 'ApplianceWorks', contact: '+27 11 345 6789' },
    'General': { name: 'HandyMan Services', contact: '+27 11 456 7890' }
  };

  const category = ticket.category || 'General';
  const vendor = vendorMap[category] || vendorMap['General'];

  await supabase
    .from('maintenance_tickets')
    .update({
      status: 'in_progress',
      contractor_name: vendor.name,
      contractor_contact: vendor.contact
    })
    .eq('id', ticket.id);

  await supabase.from('workflow_runs').insert({
    workflow_name: 'maintenance',
    entity_type: 'maintenance',
    entity_id: ticket.id,
    step: 'auto_assigned',
    meta: {
      vendor: vendor.name,
      reason: 'sla_auto_assignment',
      hours_waited: 4
    }
  });

  console.log(`Auto-assigned vendor ${vendor.name} to ticket ${ticket.id}`);
}
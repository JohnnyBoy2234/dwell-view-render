// Maintenance Request Management Edge Function
// Handles creation, assignment, and workflow for maintenance tickets

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
};

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Import classification logic (simplified version)
function classifyMaintenance(text: string) {
  const t = text.toLowerCase();
  
  // Category detection
  let category = "General";
  if (t.includes("leak") || t.includes("geyser") || t.includes("pipe") || t.includes("water")) {
    category = "Plumbing";
  } else if (t.includes("power") || t.includes("electricity") || t.includes("light")) {
    category = "Electrical";
  } else if (t.includes("stove") || t.includes("fridge") || t.includes("appliance")) {
    category = "Appliance";
  } else if (t.includes("door") || t.includes("lock") || t.includes("security")) {
    category = "Security";
  }
  
  // Urgency detection
  let urgency = "medium";
  if (t.includes("emergency") || t.includes("urgent") || t.includes("flood") || t.includes("sparks")) {
    urgency = "high";
  } else if (t.includes("minor") || t.includes("cosmetic") || t.includes("convenient")) {
    urgency = "low";
  }
  
  return { category, urgency };
}

const CreateTicketSchema = z.object({
  property_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  media: z.array(z.string()).optional().default([]),
  estimated_cost: z.number().optional()
});

const UpdateTicketSchema = z.object({
  ticket_id: z.string().uuid(),
  status: z.enum(['triaged', 'vendor_assigned', 'in_progress', 'awaiting_approval', 'completed', 'disputed', 'closed']).optional(),
  contractor_name: z.string().optional(),
  contractor_contact: z.string().optional(),
  actual_cost: z.number().optional(),
  notes: z.string().optional()
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'create';

  try {
    if (req.method === 'POST' && action === 'create') {
      return await handleCreateTicket(req);
    } else if (req.method === 'PUT' && action === 'update') {
      return await handleUpdateTicket(req);
    } else if (req.method === 'POST' && action === 'assign') {
      return await handleAssignVendor(req);
    } else if (req.method === 'POST' && action === 'complete') {
      return await handleCompleteTicket(req);
    } else if (req.method === 'GET') {
      return await handleGetTickets(req);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Maintenance management error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleCreateTicket(req: Request) {
  const body = await req.json();
  const data = CreateTicketSchema.parse(body);

  console.log(`Creating maintenance ticket for property ${data.property_id}`);

  // Get property details to find landlord
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('landlord_id')
    .eq('id', data.property_id)
    .single();

  if (propError || !property) {
    throw new Error('Property not found');
  }

  // Get tenant ID from request context (would be from auth in real app)
  const authHeader = req.headers.get('authorization');
  // For demo, we'll extract from a custom header
  const tenantId = req.headers.get('x-tenant-id');
  
  if (!tenantId) {
    throw new Error('Tenant ID required');
  }

  // Classify the issue
  const classification = classifyMaintenance(`${data.title} ${data.description}`);
  const slaHours = classification.urgency === 'high' ? 8 : 
                  classification.urgency === 'medium' ? 48 : 120;

  // Create ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('maintenance_tickets')
    .insert({
      property_id: data.property_id,
      tenant_id: tenantId,
      landlord_id: property.landlord_id,
      title: data.title,
      description: data.description,
      category: classification.category,
      urgency: classification.urgency,
      media: data.media,
      estimated_cost: data.estimated_cost,
      sla_hours: slaHours,
      status: 'triaged'
    })
    .select()
    .single();

  if (ticketError) throw ticketError;

  // Log workflow
  await supabase.from('workflow_runs').insert({
    workflow_name: 'maintenance',
    entity_type: 'maintenance',
    entity_id: ticket.id,
    step: 'reported',
    meta: { 
      classification,
      sla_hours: slaHours,
      auto_classified: true
    }
  });

  // Check if should auto-assign (if cost < threshold)
  if (data.estimated_cost && data.estimated_cost <= 1500) {
    await autoAssignVendor(ticket.id, classification.category);
  }

  console.log(`Maintenance ticket ${ticket.id} created and classified as ${classification.category}/${classification.urgency}`);

  return new Response(JSON.stringify({ 
    success: true, 
    ticket,
    classification
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleUpdateTicket(req: Request) {
  const body = await req.json();
  const data = UpdateTicketSchema.parse(body);

  const { error } = await supabase
    .from('maintenance_tickets')
    .update({
      status: data.status,
      contractor_name: data.contractor_name,
      contractor_contact: data.contractor_contact,
      actual_cost: data.actual_cost
    })
    .eq('id', data.ticket_id);

  if (error) throw error;

  // Log workflow step
  if (data.status) {
    await supabase.from('workflow_runs').insert({
      workflow_name: 'maintenance',
      entity_type: 'maintenance',
      entity_id: data.ticket_id,
      step: data.status,
      meta: { 
        contractor: data.contractor_name,
        cost: data.actual_cost
      }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleAssignVendor(req: Request) {
  const { ticket_id, vendor_name, vendor_contact, estimated_cost } = await req.json();

  await supabase
    .from('maintenance_tickets')
    .update({
      status: 'vendor_assigned',
      contractor_name: vendor_name,
      contractor_contact: vendor_contact,
      estimated_cost
    })
    .eq('id', ticket_id);

  await supabase.from('workflow_runs').insert({
    workflow_name: 'maintenance',
    entity_type: 'maintenance',
    entity_id: ticket_id,
    step: 'vendor_assigned',
    meta: { vendor_name, estimated_cost }
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleCompleteTicket(req: Request) {
  const { ticket_id, actual_cost, completion_notes } = await req.json();

  await supabase
    .from('maintenance_tickets')
    .update({
      status: 'completed',
      actual_cost
    })
    .eq('id', ticket_id);

  await supabase.from('workflow_runs').insert({
    workflow_name: 'maintenance',
    entity_type: 'maintenance',
    entity_id: ticket_id,
    step: 'completed',
    meta: { actual_cost, notes: completion_notes }
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleGetTickets(req: Request) {
  const url = new URL(req.url);
  const property_id = url.searchParams.get('property_id');
  const tenant_id = url.searchParams.get('tenant_id');
  const landlord_id = url.searchParams.get('landlord_id');

  let query = supabase
    .from('maintenance_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (property_id) query = query.eq('property_id', property_id);
  if (tenant_id) query = query.eq('tenant_id', tenant_id);
  if (landlord_id) query = query.eq('landlord_id', landlord_id);

  const { data: tickets, error } = await query;
  if (error) throw error;

  return new Response(JSON.stringify({ tickets }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function autoAssignVendor(ticketId: string, category: string) {
  // In a real system, this would select from a database of preferred vendors
  const vendorMap: Record<string, { name: string; contact: string }> = {
    'Plumbing': { name: 'SwiftFix Plumbing', contact: '+27 11 123 4567' },
    'Electrical': { name: 'PowerPro Electricians', contact: '+27 11 234 5678' },
    'Appliance': { name: 'ApplianceWorks', contact: '+27 11 345 6789' },
    'General': { name: 'HandyMan Services', contact: '+27 11 456 7890' }
  };

  const vendor = vendorMap[category] || vendorMap['General'];

  await supabase
    .from('maintenance_tickets')
    .update({
      status: 'vendor_assigned',
      contractor_name: vendor.name,
      contractor_contact: vendor.contact
    })
    .eq('id', ticketId);

  await supabase.from('workflow_runs').insert({
    workflow_name: 'maintenance',
    entity_type: 'maintenance', 
    entity_id: ticketId,
    step: 'auto_assigned',
    meta: { vendor, reason: 'under_auto_approval_limit' }
  });

  console.log(`Auto-assigned vendor ${vendor.name} to ticket ${ticketId}`);
}
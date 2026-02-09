// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { property_id, tenant_email } = await req.json();

    if (!property_id) {
      return new Response(JSON.stringify({ error: 'property_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user owns this property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, landlord_id')
      .eq('id', property_id)
      .eq('landlord_id', user.id)
      .maybeSingle();

    if (propError || !property) {
      return new Response(JSON.stringify({ error: 'Property not found or not owned by you' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique token
    const inviteToken = crypto.randomUUID();

    // Create invite record
    const { data: invite, error: insertError } = await supabase
      .from('tenant_invites')
      .insert({
        token: inviteToken,
        property_id,
        landlord_id: user.id,
        tenant_email: tenant_email || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating invite:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create invite' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the invite URL using the request origin
    const origin = req.headers.get('origin') || 'https://dwell-view-render.lovable.app';
    const inviteUrl = `${origin}/join/${inviteToken}`;

    return new Response(JSON.stringify({ 
      invite,
      invite_url: inviteUrl,
      token: inviteToken,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
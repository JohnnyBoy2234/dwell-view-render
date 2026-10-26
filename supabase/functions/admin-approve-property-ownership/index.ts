import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  property_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    if (adminCheckError || !isAdmin) {
      throw new Error('Admin access required');
    }

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { property_id }: ApproveRequest = await req.json();
    if (!property_id) {
      throw new Error('property_id is required');
    }

    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, ownership_status, title_deed_path')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      throw new Error('Property not found');
    }
    if (property.ownership_status !== 'submitted') {
      throw new Error('Property is not in submitted status');
    }
    if (!property.title_deed_path) {
      throw new Error('No title deed on file for this property');
    }

    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        ownership_status: 'verified',
        ownership_verified_at: new Date().toISOString(),
        ownership_reviewed_by: user.id,
        ownership_decline_reason: null,
      })
      .eq('id', property_id);

    if (updateError) {
      throw updateError;
    }

    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'property_ownership_verified',
      _properties: { property_id, reviewed_by: user.id },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Ownership verified', property_id }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeclineRequest {
  property_id: string;
  reason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting property ownership decline process');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }
    console.log('✅ Auth header found');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('✅ Supabase clients initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Authentication failed');
    }
    console.log('✅ User authenticated:', user.id);

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    if (adminCheckError || !isAdmin) {
      console.error('❌ Admin check failed:', adminCheckError);
      throw new Error('Admin access required');
    }
    console.log('✅ Admin access verified');

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { property_id, reason }: DeclineRequest = await req.json();
    console.log('✅ Request body parsed, property_id:', property_id);

    if (!property_id || !reason?.trim()) {
      throw new Error('property_id and reason are required');
    }

    console.log('🔍 Fetching property:', property_id);
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, ownership_status')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      console.error('❌ Property not found:', propertyError);
      throw new Error('Property not found');
    }
    console.log('✅ Property found, ownership_status:', property.ownership_status);

    if (property.ownership_status !== 'submitted') {
      throw new Error('Property is not in submitted status');
    }

    console.log('📝 Updating property ownership_status to declined');
    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        ownership_status: 'declined',
        ownership_reviewed_by: user.id,
        ownership_decline_reason: reason.trim(),
        ownership_verified_at: null,
      })
      .eq('id', property_id);

    if (updateError) {
      console.error('❌ Failed to update property:', updateError);
      throw updateError;
    }
    console.log('✅ Property ownership_status updated to declined');

    console.log('📊 Logging telemetry event');
    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'property_ownership_declined',
      _properties: { property_id, reviewed_by: user.id, reason: reason.trim() },
    });
    console.log('✅ Telemetry event logged');

    console.log('🎉 Property ownership decline process completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Ownership declined', property_id, reason: reason.trim() }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('💥 Error in admin-decline-property-ownership function:', error);
    console.error('💥 Error stack:', error.stack);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

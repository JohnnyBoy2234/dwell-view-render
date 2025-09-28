import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeclineRequest {
  user_id: string;
  reason: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Initialize Supabase clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin access
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

    const { user_id, reason }: DeclineRequest = await req.json();

    if (!user_id || !reason?.trim()) {
      throw new Error('User ID and reason are required');
    }

    // Get current KYC profile
    const { data: kycProfile, error: kycError } = await supabaseAdmin
      .from('kyc_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (kycError || !kycProfile) {
      throw new Error('KYC profile not found');
    }

    if (kycProfile.status !== 'submitted') {
      throw new Error('KYC profile is not in submitted status');
    }

    // Update KYC profile to declined
    const { error: updateError } = await supabaseAdmin
      .from('kyc_profiles')
      .update({
        status: 'declined',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: reason.trim()
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw updateError;
    }

    // Create audit log for decline (non-blocking)
    try {
      await supabaseAdmin.rpc('create_kyc_audit_log', {
        _user_id: user_id,
        _action: 'declined',
        _actor: user.id,
        _metadata: {
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          decline_reason: reason.trim()
        }
      });
    } catch (auditErr) {
      console.error('create_kyc_audit_log failed:', auditErr);
    }

    // Log telemetry event (non-blocking)
    try {
      await supabaseAdmin.rpc('log_event', {
        _user_id: user_id,
        _name: 'kyc_declined',
        _properties: {
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          decline_reason: reason.trim()
        }
      });
    } catch (eventErr) {
      console.error('log_event failed:', eventErr);
    }

    // Optional: email/SMS could be sent here via provider if configured
    console.log(`KYC declined for user ${user_id} by ${user.id} with reason: ${reason}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'KYC declined successfully',
        user_id: user_id,
        reason: reason.trim()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in kyc-admin-decline function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
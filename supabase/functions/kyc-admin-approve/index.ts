import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('KYC approval function started');
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }
    
    console.log('Auth header found');

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

    const { user_id }: ApproveRequest = await req.json();
    console.log('Request parsed, user_id:', user_id);

    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Get current KYC profile
    console.log('Fetching KYC profile for user:', user_id);
    const { data: kycProfile, error: kycError } = await supabaseAdmin
      .from('kyc_profiles')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (kycError || !kycProfile) {
      console.error('KYC profile fetch error:', kycError);
      throw new Error('KYC profile not found');
    }
    
    console.log('KYC profile found, status:', kycProfile.status);

    if (kycProfile.status !== 'submitted') {
      throw new Error('KYC profile is not in submitted status');
    }

    // Update KYC profile to approved
    console.log('Updating KYC profile to approved');
    const { error: updateError } = await supabaseAdmin
      .from('kyc_profiles')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: null
      })
      .eq('user_id', user_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error(`Failed to update KYC profile: ${updateError.message}`);
    }

    console.log('KYC profile updated successfully');

    // Create notification for user
    console.log('Creating notification');
    const { error: notifyError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user_id,
        message: 'Your identity verification has been approved! ✅',
        link_url: '/verify-id',
        type: 'kyc_approved',
        metadata: {
          approved_by: user.id,
          approved_at: new Date().toISOString()
        }
      });

    if (notifyError) {
      console.error('Notification error:', notifyError);
      // Don't throw - approval succeeded even if notification failed
    } else {
      console.log('Notification created successfully');
    }

    console.log(`KYC approved for user ${user_id} by ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'KYC approved successfully',
        user_id: user_id
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
    console.error('Error in kyc-admin-approve function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
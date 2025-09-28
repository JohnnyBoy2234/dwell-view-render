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

    const { user_id }: ApproveRequest = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
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

    // Update KYC profile to approved
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
      throw updateError;
    }

    // Create audit log for approval
    await supabaseAdmin.rpc('create_kyc_audit_log', {
      _user_id: user_id,
      _action: 'approved',
      _actor: user.id,
      _metadata: {
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      }
    });

    // Log telemetry event
    await supabaseAdmin.rpc('log_event', {
      _user_id: user_id,
      _name: 'kyc_approved',
      _properties: {
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      }
    });

    // Delete original documents from storage for privacy
    const filesToDelete = [];
    if (kycProfile.id_front_path) filesToDelete.push(kycProfile.id_front_path);
    if (kycProfile.id_back_path) filesToDelete.push(kycProfile.id_back_path);
    if (kycProfile.selfie_path) filesToDelete.push(kycProfile.selfie_path);
    // Handle legacy field names
    if (kycProfile.id_doc_path) filesToDelete.push(kycProfile.id_doc_path);

    if (filesToDelete.length > 0) {
      try {
        const { error: deleteError } = await supabaseAdmin.storage
          .from('kyc-uploads')
          .remove(filesToDelete);

        if (deleteError) {
          console.error('Error deleting files:', deleteError);
          // Don't throw - continue with approval but log the issue
        }

        // Clear file paths from profile
        await supabaseAdmin
          .from('kyc_profiles')
          .update({
            id_front_path: null,
            id_back_path: null,
            id_doc_path: null, // legacy field
            selfie_path: null
          })
          .eq('user_id', user_id);

        // Create audit log for deletion
        await supabaseAdmin.rpc('create_kyc_audit_log', {
          _user_id: user_id,
          _action: 'deleted_originals',
          _actor: user.id,
          _metadata: {
            deleted_files: filesToDelete,
            deleted_at: new Date().toISOString()
          }
        });

      } catch (deleteErr) {
        console.error('File deletion error:', deleteErr);
        // Continue - don't fail the approval
      }
    }

    // Get user profile for notification
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', user_id)
      .single();

    const userName = profile?.display_name || 'User';

    // Create notification for user
    await supabaseAdmin.rpc('create_notification', {
      _user_id: user_id,
      _message: `Your identity verification has been approved! ✅`,
      _link_url: '/verify-id',
      _type: 'kyc_approved',
      _metadata: {
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }
    });

    // TODO: Send email notification to user about approval
    // TODO: Send SMS/WhatsApp notification if configured
    console.log(`Would send approval notification to ${userName} (${user_id})`);

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
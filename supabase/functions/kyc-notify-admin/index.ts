import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { user_id }: NotifyRequest = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    // Get user profile info
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    const userName = profile?.display_name || `User ${user_id.slice(0, 8)}`;

    // Get all admin users
    const { data: adminUsers, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(display_name)
      `)
      .eq('role', 'admin');

    if (adminError) {
      console.error('Error fetching admins:', adminError);
      throw adminError;
    }

    // Create notifications for all admins
    const notifications = adminUsers.map(admin => ({
      user_id: admin.user_id,
      message: `New KYC submission from ${userName} requires review`,
      link_url: '/admin/kyc',
      type: 'kyc_submission',
      metadata: {
        submitted_by: user_id,
        submitted_at: new Date().toISOString()
      }
    }));

    if (notifications.length > 0) {
      const { error: notifError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }
    }

    // TODO: Send email notifications to admins
    // TODO: Send WhatsApp notifications if configured
    // For now, we'll just log that these would be sent
    console.log(`Would send email/WhatsApp notifications to ${adminUsers.length} admins for KYC submission from ${userName}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin notifications sent',
        notified_admins: adminUsers.length 
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
    console.error('Error in kyc-notify-admin function:', error);
    
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
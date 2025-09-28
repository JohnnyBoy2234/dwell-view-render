import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticsResponse {
  userId: string;
  emailVerified: boolean;
  kycStatus: string;
  canRequestViewing: boolean;
  notes: string[];
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

    if (req.method !== 'GET') {
      throw new Error('Method not allowed');
    }

    // Get userId from query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      throw new Error('userId query parameter is required');
    }

    // Check user gate status using our secure function
    const { data: gateStatusData, error: gateError } = await supabaseAdmin
      .rpc('check_user_gate_status', { _user_id: userId })
      .single();

    if (gateError) {
      throw new Error(`Failed to check gate status: ${gateError.message}`);
    }

    const gateStatus = gateStatusData as {
      user_id: string;
      email_verified: boolean;
      kyc_status: string;
      can_request_viewing: boolean;
    };

    // Get additional context from KYC profile
    const { data: kycProfile, error: kycError } = await supabaseAdmin
      .from('kyc_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (kycError) {
      console.warn('Error fetching KYC profile:', kycError);
    }

    // Build notes with detailed information
    const notes: string[] = [];
    
    if (!gateStatus.email_verified) {
      notes.push('Email verification required - user must verify their email address');
    }
    
    if (gateStatus.kyc_status === 'not_started') {
      notes.push('KYC not started - user needs to begin identity verification process');
    } else if (gateStatus.kyc_status === 'submitted') {
      notes.push('KYC submitted - awaiting admin review');
    } else if (gateStatus.kyc_status === 'declined') {
      notes.push(`KYC declined - ${kycProfile?.notes || 'Reason not provided'}`);
    }
    
    if (gateStatus.can_request_viewing) {
      notes.push('All requirements met - user can request viewings');
    } else {
      notes.push('Cannot request viewings - requirements not met');
    }

    const diagnosticsResponse: DiagnosticsResponse = {
      userId: userId,
      emailVerified: gateStatus.email_verified,
      kycStatus: gateStatus.kyc_status,
      canRequestViewing: gateStatus.can_request_viewing,
      notes: notes
    };

    // Log diagnostic check event
    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'admin_diagnostics_check',
      _properties: {
        checked_user_id: userId,
        result: diagnosticsResponse
      }
    });

    return new Response(
      JSON.stringify(diagnosticsResponse),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in diagnostics-gates function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        status: error.message.includes('required') || error.message.includes('Admin access') ? 403 : 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});
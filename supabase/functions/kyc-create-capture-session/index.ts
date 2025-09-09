import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateSessionRequest {
  purpose: 'id_front' | 'id_back' | 'selfie';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: userData } = await supabase.auth.getUser(token);
    
    if (!userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: CreateSessionRequest = await req.json();
    const { purpose } = body;

    if (!['id_front', 'id_back', 'selfie'].includes(purpose)) {
      return new Response(JSON.stringify({ error: 'Invalid purpose' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create capture session
    const { data: session, error: sessionError } = await supabase
      .from('kyc_capture_sessions')
      .insert({
        desktop_user_id: userData.user.id,
        purpose: purpose,
        status: 'pending'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return new Response(JSON.stringify({ error: 'Failed to create session' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create JWT token for upload (expires in 15 minutes)
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-secret-key-change-in-production';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    const uploadToken = await create(
      { alg: 'HS256', typ: 'JWT' },
      { 
        sid: session.id, 
        purpose: purpose,
        exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
      },
      key
    );

    const baseUrl = req.headers.get('origin') || supabaseUrl.replace('https://', 'https://');
    const deeplink = `/kyc/capture?sid=${session.id}&t=${uploadToken}`;
    const qrPayload = `${baseUrl}${deeplink}`;

    return new Response(JSON.stringify({
      sid: session.id,
      deeplink: deeplink,
      qrPayload: qrPayload
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in create-capture-session:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
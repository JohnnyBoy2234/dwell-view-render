import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sid = url.searchParams.get('sid');
    const token = url.searchParams.get('t');

    console.log('Kyc upload capture request:', { sid, token: token ? 'present' : 'missing' });

    if (!sid || !token) {
      console.error('Missing required parameters:', { sid: !!sid, token: !!token });
      return new Response(JSON.stringify({ error: 'Missing sid or token' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'RentLekker-kyc-capture-secret-key-2024';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );

    let tokenPayload;
    try {
      tokenPayload = await verify(token, key);
      console.log('Token verified successfully:', { sid: tokenPayload.sid, purpose: tokenPayload.purpose });
    } catch (err) {
      console.error('Token verification failed:', (err as Error).message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token', details: (err as Error).message }), {
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (tokenPayload.sid !== sid) {
      console.error('Token session mismatch:', { tokenSid: tokenPayload.sid, requestSid: sid });
      return new Response(JSON.stringify({ error: 'Token session mismatch' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session exists and is pending
    const { data: session, error: sessionError } = await supabase
      .from('kyc_capture_sessions')
      .select('*')
      .eq('id', sid)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      console.error('Session query error:', sessionError, 'Session found:', !!session);
      return new Response(JSON.stringify({ error: 'Session not found or expired', details: sessionError?.message }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Session found:', { id: session.id, purpose: session.purpose, status: session.status });

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('No file provided in form data');
      return new Response(JSON.stringify({ error: 'No file provided' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('File received:', { name: file.name, type: file.type, size: file.size });

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create storage path
    const timestamp = new Date().toISOString();
    const fileExtension = file.type.split('/')[1] || 'jpg';
    const filePath = `kyc/${session.desktop_user_id}/${session.purpose}_${sid}_${timestamp}.${fileExtension}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-uploads')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('File uploaded to storage:', filePath);

    // Update session status
    const { error: updateError } = await supabase
      .from('kyc_capture_sessions')
      .update({
        status: 'uploaded',
        file_path: filePath
      })
      .eq('id', sid);

    if (updateError) {
      console.error('Session update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update session', details: updateError.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Session updated successfully');

    // Broadcast to realtime channel
    const channel = supabase.channel(`kyc_capture:${sid}`);
    await channel.send({
      type: 'broadcast',
      event: 'status',
      payload: { status: 'uploaded', filePath: filePath }
    });

    console.log(`File uploaded successfully: ${filePath}`);
    return new Response(JSON.stringify({ success: true, filePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in kyc-upload-capture:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
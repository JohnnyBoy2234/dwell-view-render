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

    if (!sid || !token) {
      return new Response('Missing sid or token', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Verify JWT token
    const jwtSecret = Deno.env.get('JWT_SECRET') || 'your-secret-key-change-in-production';
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
    } catch (err) {
      return new Response('Invalid or expired token', { 
        status: 401, 
        headers: corsHeaders 
      });
    }

    if (tokenPayload.sid !== sid) {
      return new Response('Token session mismatch', { 
        status: 401, 
        headers: corsHeaders 
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
      return new Response('Session not found or expired', { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response('No file provided', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return new Response('Invalid file type. Only JPEG, PNG, and WebP are allowed.', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response('File too large. Maximum size is 10MB.', { 
        status: 400, 
        headers: corsHeaders 
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
      return new Response('Failed to upload file', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

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
      return new Response('Failed to update session', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
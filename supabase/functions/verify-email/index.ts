import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Invalid Verification Link</h1>
            <p>The verification link is missing required parameters.</p>
          </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find the verification token
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('email_verification_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Invalid or Expired Link</h1>
            <p>This verification link is invalid or has already been used.</p>
            <a href="/" style="color: #2563eb; text-decoration: none;">Return to Homepage</a>
          </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    if (now > expiresAt) {
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Link Expired</h1>
            <p>This verification link has expired. Please request a new verification email.</p>
            <a href="/auth" style="color: #2563eb; text-decoration: none;">Sign In</a>
          </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Mark token as used
    const { error: updateTokenError } = await supabaseClient
      .from('email_verification_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id);

    if (updateTokenError) {
      console.error('Error updating token:', updateTokenError);
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Verification Failed</h1>
            <p>There was an error processing your verification. Please try again.</p>
          </body>
        </html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Mark user as verified in profiles table
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ email_verified: true })
      .eq('user_id', tokenData.user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">Verification Failed</h1>
            <p>There was an error updating your profile. Please contact support.</p>
          </body>
        </html>`,
        { status: 500, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Generate a login session for the user
    const { data: { user }, error: signInError } = await supabaseClient.auth.admin.getUserById(tokenData.user_id);
    
    if (signInError || !user) {
      console.error('Error getting user:', signInError);
      return new Response(
        `<html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc2626;">User Not Found</h1>
            <p>Could not find the user associated with this verification token.</p>
          </body>
        </html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Return success page with auto-redirect and session handling
    const redirectScript = `
      <script>
        // Store verification success flag
        localStorage.setItem('emailVerified', 'true');
        localStorage.setItem('verificationMessage', 'Your email has been verified! You\\'re now logged in.');
        
        // Redirect to auth page where the app will handle auto-login
        setTimeout(() => {
          window.location.href = '/auth?verified=true&userId=${tokenData.user_id}';
        }, 2000);
      </script>
    `;

    return new Response(
      `<html>
        <head>
          <title>Email Verified - SwiftRent</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f8f9fa;">
          <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="color: #16a34a; font-size: 48px; margin-bottom: 20px;">✓</div>
            <h1 style="color: #16a34a; margin-bottom: 15px;">Email Verified!</h1>
            <p style="color: #374151; margin-bottom: 20px;">
              Your email has been successfully verified. You're now being logged in automatically.
            </p>
            <div style="margin-top: 30px;">
              <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid #e5e7eb; border-top: 3px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <p style="color: #6b7280; margin-top: 10px;">Redirecting to SwiftRent...</p>
            </div>
          </div>
          <style>
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          ${redirectScript}
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: any) {
    console.error('Error in verify-email function:', error);
    return new Response(
      `<html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc2626;">Verification Error</h1>
          <p>An unexpected error occurred during verification.</p>
          <a href="/" style="color: #2563eb; text-decoration: none;">Return to Homepage</a>
        </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
});
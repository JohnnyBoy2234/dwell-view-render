import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, displayName } = await req.json()

    if (!email || !displayName) {
      return new Response(
        JSON.stringify({ error: 'Email and display name are required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // 1. Check if user already exists
    const { data: existingUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (userError) throw userError

    let userId: string

    if (existingUser) {
      // User exists, get their ID
      userId = existingUser.id
    } else {
      // Create new user with email auth
      const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true, // Skip email confirmation
        user_metadata: { display_name: displayName }
      })

      if (signUpError) throw signUpError
      if (!authData.user) throw new Error('Failed to create user')
      
      userId = authData.user.id

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          display_name: displayName,
          email,
          updated_at: new Date().toISOString()
        })

      if (profileError) throw profileError
    }

    // 3. Add admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        { 
          user_id: userId, 
          role: 'admin',
          created_at: new Date().toISOString()
        },
        { onConflict: 'user_id,role' }
      )

    if (roleError) throw roleError

    // 4. Send magic link if this is a new user
    if (!existingUser) {
      const { error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${Deno.env.get('SITE_URL')}/auth/callback`,
        }
      })

      if (linkError) {
        console.error('Error generating magic link:', linkError)
        // Continue even if magic link fails - user can reset password
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in create-admin-user:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create admin user';
    const errorDetails = (error as any)?.details || null;
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

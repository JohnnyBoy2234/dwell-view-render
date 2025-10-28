import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    // Get all profiles
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')

    // Get all user roles
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('*')

    // Combine the data
    const usersWithProfiles = users.map(user => {
      const profile = profiles?.find(p => p.user_id === user.id)
      const roles = userRoles?.filter(ur => ur.user_id === user.id).map(ur => ur.role) || []
      
      return {
        id: user.id,
        email: user.email || 'No email',
        full_name: profile?.display_name || '',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_banned: user.banned_until !== null,
        roles: roles
      }
    })

    return new Response(
      JSON.stringify(usersWithProfiles),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

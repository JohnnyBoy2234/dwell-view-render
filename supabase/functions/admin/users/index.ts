import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle DELETE request for user deletion
    if (req.method === 'DELETE') {
      const { userId } = await req.json()
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.log('Deleting user:', userId)

      // Delete from user_roles first (foreign key constraint)
      const { error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
      
      if (rolesError) {
        console.error('Error deleting user roles:', rolesError)
      }

      // Delete from profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId)
      
      if (profileError) {
        console.error('Error deleting profile:', profileError)
      }

      // Delete the user from auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (authError) {
        throw authError
      }

      console.log('User deleted successfully:', userId)

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Handle GET request - list all users
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
        is_banned: (user as any).banned_until !== null,
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
    console.error('Error in admin/users function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

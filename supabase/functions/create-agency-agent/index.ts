// @ts-nocheck
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import { corsHeaders } from '../_shared/cors.ts'

type CreateAgencyAgentRequest = {
  agency_id: string
  email: string
  password: string
  display_name: string
  mobile?: string
  license_number?: string
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const callerId = userRes.user.id

    const body: CreateAgencyAgentRequest = await req.json()

    if (!body?.agency_id || !body?.email || !body?.password || !body?.display_name) {
      return new Response(JSON.stringify({ error: 'agency_id, email, password, and display_name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure agency exists and is approved
    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('agencies')
      .select('id,status')
      .eq('id', body.agency_id)
      .single()

    if (agencyErr || !agency) {
      return new Response(JSON.stringify({ error: 'Agency not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (agency.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Agency is not approved' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is agency admin
    const { data: isAgencyAdmin, error: isAgencyAdminErr } = await supabase.rpc('is_agency_admin', {
      _agency_id: body.agency_id,
      _user_id: callerId,
    })

    if (isAgencyAdminErr) {
      return new Response(JSON.stringify({ error: 'Failed to verify agency admin' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isAgencyAdmin) {
      return new Response(JSON.stringify({ error: 'Agency admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create auth user
    const { data: created, error: createUserErr } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        display_name: body.display_name,
      },
    })

    if (createUserErr || !created?.user) {
      return new Response(JSON.stringify({ error: createUserErr?.message || 'Failed to create user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const agentUserId = created.user.id

    // Create profile (if your app uses profiles)
    await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: agentUserId,
        display_name: body.display_name,
        email: body.email,
        updated_at: new Date().toISOString(),
      })

    // Assign platform role "agent"
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          user_id: agentUserId,
          role: 'agent',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,role' },
      )

    if (roleErr) {
      return new Response(JSON.stringify({ error: roleErr.message || 'Failed to set user role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Add agency membership
    const { error: memberErr } = await supabaseAdmin
      .from('agency_members')
      .insert({
        agency_id: body.agency_id,
        user_id: agentUserId,
        role: 'agent',
      })

    if (memberErr) {
      return new Response(JSON.stringify({ error: memberErr.message || 'Failed to add agency membership' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create agent profile
    const { error: agentProfileErr } = await supabaseAdmin
      .from('agent_profiles')
      .insert({
        user_id: agentUserId,
        agency_id: body.agency_id,
        display_name: body.display_name,
        mobile: body.mobile ?? null,
        email: body.email,
        license_number: body.license_number ?? null,
        status: 'active',
      })

    if (agentProfileErr) {
      return new Response(JSON.stringify({ error: agentProfileErr.message || 'Failed to create agent profile' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: agentUserId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create agency agent'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

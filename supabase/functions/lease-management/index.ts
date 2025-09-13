import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LeaseData {
  landlord: {
    name: string;
    id_number: string;
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  tenant: {
    name: string;
    id_number: string;
    email: string;
    phone: string;
    current_address: string;
    occupants: Array<{
      name: string;
      relationship: string;
      age: string;
    }>;
  };
  property: {
    address: string;
    unit: string;
    city: string;
    province: string;
    postal_code: string;
    type: 'apartment' | 'house' | 'townhouse';
    parking: 'N/A' | '1 bay' | '2 bays';
  };
  term: {
    start_date: string;
    end_date: string;
    option_to_renew: boolean;
    notice_period_days: number;
  };
  rent: {
    monthly_rent: number;
    due_day: number;
    payment_method: 'EFT' | 'Cash' | 'Cheque';
    late_fee_policy: {
      grace_days: number;
      late_fee_fixed: number;
      late_fee_percent: number;
    };
  };
  deposit: {
    amount: number;
    return_days: number;
  };
  utilities: {
    water: 'tenant' | 'landlord' | 'included';
    electricity: 'tenant' | 'landlord' | 'included';
    internet: 'tenant' | 'landlord' | 'included';
    other: string;
  };
  maintenance: {
    tenant_minor_repairs_cap: number;
    landlord_responsible: string[];
  };
  access: {
    entry_notice_hours: number;
  };
  governing_law: string;
  attachments: {
    move_in_inspection_required: boolean;
    annexures: string[];
  };
  branding: {
    logo_url: string;
    primary_hex: string;
    secondary_hex: string;
    font_family: string;
  };
}

async function generateDefaultLeaseData(propertyId: string, landlordUserId: string, tenantUserId: string | null, supabaseClient: any): Promise<LeaseData> {
  try {
    // Fetch property details
    const { data: property, error: propertyError } = await supabaseClient
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single()

    if (propertyError) throw new Error(`Property not found: ${propertyError.message}`)

    // Fetch landlord details
    const { data: landlord, error: landlordError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', landlordUserId)
      .single()

    if (landlordError) throw new Error(`Landlord profile not found: ${landlordError.message}`)

    // Fetch tenant details if provided
    let tenant = null
    if (tenantUserId) {
      const { data: tenantData, error: tenantError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', tenantUserId)
        .single()

      if (!tenantError) {
        tenant = tenantData
      }
    }

  // Default lease data
  const defaultLeaseData: LeaseData = {
    landlord: {
      name: landlord?.display_name || 'Landlord Name',
      id_number: landlord?.id_number || '',
      company: landlord?.company || '',
      email: landlord?.email || '',
      phone: landlord?.phone || '',
      address: landlord?.address || ''
    },
    tenant: {
      name: tenant?.display_name || 'Tenant Name',
      id_number: tenant?.id_number || '',
      email: tenant?.email || '',
      phone: tenant?.phone || '',
      current_address: tenant?.address || '',
      occupants: []
    },
    property: {
      address: property?.location || '',
      unit: property?.unit || '',
      city: property?.city || '',
      province: property?.province || '',
      postal_code: property?.postal_code || '',
      type: property?.property_type || 'apartment',
      parking: (property?.parking_spaces && property.parking_spaces > 0) ? `${property.parking_spaces} bay` : 'N/A'
    },
    term: {
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      option_to_renew: true,
      notice_period_days: 30
    },
    rent: {
      monthly_rent: property?.price || 0,
      due_day: 1,
      payment_method: 'EFT',
      late_fee_policy: {
        grace_days: 5,
        late_fee_fixed: 0,
        late_fee_percent: 0
      }
    },
    deposit: {
      amount: property?.price ? property.price * 2 : 0, // 2 months rent
      return_days: 14
    },
    utilities: {
      water: 'tenant',
      electricity: 'tenant',
      internet: 'tenant',
      other: ''
    },
    maintenance: {
      tenant_minor_repairs_cap: 500,
      landlord_responsible: ['structural', 'plumbing', 'electrical']
    },
    access: {
      entry_notice_hours: 24
    },
    governing_law: 'South Africa',
    attachments: {
      move_in_inspection_required: true,
      annexures: ['move-in checklist', 'house rules']
    },
    branding: {
      logo_url: 'https://swiftrent.co.za/logo.png',
      primary_hex: '#2563EB',
      secondary_hex: '#0EA5E9',
      font_family: 'Inter, system-ui, sans-serif'
    }
  }

  return defaultLeaseData
  } catch (error) {
    console.error('Error in generateDefaultLeaseData:', error)
    throw new Error(`Failed to generate default lease data: ${error.message}`)
  }
}

async function logLeaseAction(supabaseClient: any, leaseId: string, actorUserId: string, action: string, metadata: any = null) {
  await supabaseClient
    .from('lease_audit_logs')
    .insert({
      lease_id: leaseId,
      actor_user_id: actorUserId,
      action: action,
      metadata: metadata
    })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body first to get action
    const requestBody = await req.json()
    const { action } = requestBody

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user
    console.log('Verifying user authentication...')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      console.error('User authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('User authenticated successfully:', user.id)

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      case 'test': {
        const { property_id, tenant_user_id, lease_data } = requestBody
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Test endpoint working',
            received_data: {
              property_id,
              tenant_user_id,
              lease_data_provided: !!lease_data
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      case 'generate': {
        try {
          console.log('=== GENERATE CASE STARTED ===')
          const { property_id, tenant_user_id, lease_data } = requestBody

          console.log('Lease generation request:', { 
            property_id, 
            tenant_user_id, 
            lease_data_provided: !!lease_data,
            lease_data_keys: lease_data ? Object.keys(lease_data) : 'none'
          })
          
          // For now, just return success to test if the function is reachable
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Lease generation endpoint reached successfully',
              received_data: {
                property_id,
                tenant_user_id,
                has_lease_data: !!lease_data
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
          
          console.log('About to check if lease_data exists...')
          
          /* COMMENTED OUT FOR TESTING
          if (lease_data) {
            console.log('Lease data structure:', {
              landlord: lease_data.landlord ? Object.keys(lease_data.landlord) : 'missing',
              tenant: lease_data.tenant ? Object.keys(lease_data.tenant) : 'missing',
              property: lease_data.property ? Object.keys(lease_data.property) : 'missing',
              term: lease_data.term ? Object.keys(lease_data.term) : 'missing',
              rent: lease_data.rent ? Object.keys(lease_data.rent) : 'missing',
              deposit: lease_data.deposit ? Object.keys(lease_data.deposit) : 'missing',
              branding: lease_data.branding ? Object.keys(lease_data.branding) : 'missing'
            })
          }

          if (!property_id) {
            console.error('Missing property_id in request')
            return new Response(
              JSON.stringify({ error: 'property_id is required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

        // Check if user is landlord of this property
        const { data: property, error: propertyError } = await supabaseClient
          .from('properties')
          .select('landlord_id')
          .eq('id', property_id)
          .single()

        if (propertyError || property.landlord_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Property not found or access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check for existing active lease
        const { data: existingLease } = await supabaseClient
          .from('leases')
          .select('*')
          .eq('property_id', property_id)
          .in('status', ['DRAFT', 'PENDING_TENANT_SIGNATURE', 'PENDING_LANDLORD_SIGNATURE'])
          .order('version', { ascending: false })
          .limit(1)
          .single()

        let version = 1
        if (existingLease) {
          version = existingLease.version + 1
          // Cancel existing lease
          await supabaseClient
            .from('leases')
            .update({ status: 'CANCELED' })
            .eq('id', existingLease.id)
        }

        // Generate lease data
        const finalLeaseData = lease_data || await generateDefaultLeaseData(property_id, user.id, tenant_user_id, supabaseClient)
        
        // Validate lease data structure
        if (lease_data) {
          const requiredFields = ['landlord', 'tenant', 'property', 'term', 'rent', 'deposit', 'branding']
          console.log('Validating required fields:', requiredFields)
          console.log('lease_data keys:', Object.keys(lease_data))
          console.log('lease_data values check:', {
            landlord: !!lease_data.landlord,
            tenant: !!lease_data.tenant,
            property: !!lease_data.property,
            term: !!lease_data.term,
            rent: !!lease_data.rent,
            deposit: !!lease_data.deposit,
            branding: !!lease_data.branding
          })
          
          const missingFields = requiredFields.filter(field => !lease_data[field])
          
          if (missingFields.length > 0) {
            console.error('Missing required lease data fields:', missingFields)
            return new Response(
              JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          // Validate numeric values
          if (lease_data.rent && (isNaN(lease_data.rent.monthly_rent) || lease_data.rent.monthly_rent <= 0)) {
            console.error('Invalid monthly rent:', lease_data.rent.monthly_rent)
            return new Response(
              JSON.stringify({ error: 'Invalid monthly rent amount' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          if (lease_data.deposit && (isNaN(lease_data.deposit.amount) || lease_data.deposit.amount < 0)) {
            console.error('Invalid deposit amount:', lease_data.deposit.amount)
            return new Response(
              JSON.stringify({ error: 'Invalid deposit amount' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          // Validate branding structure
          if (lease_data.branding) {
            const requiredBrandingFields = ['logo_url', 'primary_hex', 'secondary_hex', 'font_family']
            const missingBrandingFields = requiredBrandingFields.filter(field => !lease_data.branding[field])
            
            if (missingBrandingFields.length > 0) {
              console.error('Missing required branding fields:', missingBrandingFields)
              return new Response(
                JSON.stringify({ error: `Missing branding fields: ${missingBrandingFields.join(', ')}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              )
            }
          }
        }

        // Generate PDF
        console.log('Generating PDF with data:', { 
          version, 
          lease_data_keys: Object.keys(finalLeaseData),
          lease_data_structure: JSON.stringify(finalLeaseData, null, 2)
        })
        const { data: pdfResponse, error: pdfError } = await supabaseClient.functions.invoke('generate-lease-pdf', {
          body: { lease_data: finalLeaseData, version }
        })

        if (pdfError) {
          console.error('PDF generation error:', pdfError)
          throw new Error(`PDF generation failed: ${pdfError.message}`)
        }

        console.log('PDF generated successfully:', pdfResponse)

        // Create lease record
        const { data: lease, error: leaseError } = await supabaseClient
          .from('leases')
          .insert({
            property_id,
            landlord_user_id: user.id,
            tenant_user_id: tenant_user_id,
            version,
            status: 'DRAFT',
            lease_data: finalLeaseData,
            pdf_draft_url: pdfResponse.pdf_url
          })
          .select()
          .single()

        if (leaseError) {
          throw new Error(`Lease creation failed: ${leaseError.message}`)
        }

        // Log action
        await logLeaseAction(supabaseClient, lease.id, user.id, 'GENERATED', { version })

        return new Response(
          JSON.stringify({ success: true, lease }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
        } catch (error) {
          console.error('Error in lease generation:', error)
          console.error('Error stack:', error.stack)
          return new Response(
            JSON.stringify({ 
              error: error.message || 'Lease generation failed',
              details: error.toString(),
              stack: error.stack 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      */ // END COMMENTED OUT FOR TESTING

      case 'sign': {
        const { lease_id, role, signature_png_base64 } = requestBody

        if (!lease_id || !role || !signature_png_base64) {
          return new Response(
            JSON.stringify({ error: 'lease_id, role, and signature_png_base64 are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get lease
        const { data: lease, error: leaseError } = await supabaseClient
          .from('leases')
          .select('*')
          .eq('id', lease_id)
          .single()

        if (leaseError) {
          return new Response(
            JSON.stringify({ error: 'Lease not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user can sign for this role
        const canSign = (role === 'LANDLORD' && lease.landlord_user_id === user.id) ||
                       (role === 'TENANT' && lease.tenant_user_id === user.id)

        if (!canSign) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if already signed
        const { data: existingSignature } = await supabaseClient
          .from('lease_signatures')
          .select('*')
          .eq('lease_id', lease_id)
          .eq('role', role)
          .single()

        if (existingSignature && existingSignature.signed_at) {
          return new Response(
            JSON.stringify({ error: 'Already signed' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Upload signature image
        const signatureBuffer = Uint8Array.from(atob(signature_png_base64), c => c.charCodeAt(0))
        const signatureFilename = `signature_${lease_id}_${role}_${Date.now()}.png`
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('lease-signatures')
          .upload(signatureFilename, signatureBuffer, {
            contentType: 'image/png',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Signature upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabaseClient.storage
          .from('lease-signatures')
          .getPublicUrl(signatureFilename)

        // Generate signature hash
        const signatureHash = await crypto.subtle.digest('SHA-256', 
          new TextEncoder().encode(`${user.id}_${lease_id}_${Date.now()}`)
        )
        const signatureHashHex = Array.from(new Uint8Array(signatureHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')

        // Create or update signature record
        const signatureData = {
          lease_id,
          role,
          signer_user_id: user.id,
          signed_at: new Date().toISOString(),
          signature_image_url: urlData.publicUrl,
          signature_hash: signatureHashHex,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }

        if (existingSignature) {
          await supabaseClient
            .from('lease_signatures')
            .update(signatureData)
            .eq('id', existingSignature.id)
        } else {
          await supabaseClient
            .from('lease_signatures')
            .insert(signatureData)
        }

        // Update lease status
        const { data: allSignatures } = await supabaseClient
          .from('lease_signatures')
          .select('*')
          .eq('lease_id', lease_id)
          .not('signed_at', 'is', null)

        let newStatus = lease.status
        if (allSignatures.length === 2) {
          newStatus = 'COMPLETED'
          // TODO: Generate final signed PDF here
        } else if (role === 'LANDLORD') {
          newStatus = 'PENDING_TENANT_SIGNATURE'
        } else if (role === 'TENANT') {
          newStatus = 'PENDING_LANDLORD_SIGNATURE'
        }

        await supabaseClient
          .from('leases')
          .update({ status: newStatus })
          .eq('id', lease_id)

        // Log action
        await logLeaseAction(supabaseClient, lease_id, user.id, 'SIGNED', { role })

        return new Response(
          JSON.stringify({ success: true, status: newStatus }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'request-changes': {
        const { lease_id, reason } = requestBody

        if (!lease_id || !reason) {
          return new Response(
            JSON.stringify({ error: 'lease_id and reason are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get lease
        const { data: lease, error: leaseError } = await supabaseClient
          .from('leases')
          .select('*')
          .eq('id', lease_id)
          .single()

        if (leaseError) {
          return new Response(
            JSON.stringify({ error: 'Lease not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify user can request changes
        const canRequestChanges = lease.landlord_user_id === user.id || lease.tenant_user_id === user.id

        if (!canRequestChanges) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update status
        await supabaseClient
          .from('leases')
          .update({ status: 'CHANGES_REQUESTED' })
          .eq('id', lease_id)

        // Log action
        await logLeaseAction(supabaseClient, lease_id, user.id, 'REQUESTED_CHANGES', { reason })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel': {
        const { lease_id } = requestBody

        if (!lease_id) {
          return new Response(
            JSON.stringify({ error: 'lease_id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get lease
        const { data: lease, error: leaseError } = await supabaseClient
          .from('leases')
          .select('*')
          .eq('id', lease_id)
          .single()

        if (leaseError) {
          return new Response(
            JSON.stringify({ error: 'Lease not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Only landlord can cancel
        if (lease.landlord_user_id !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Only landlord can cancel lease' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Can only cancel if no signatures yet
        const { data: signatures } = await supabaseClient
          .from('lease_signatures')
          .select('*')
          .eq('lease_id', lease_id)
          .not('signed_at', 'is', null)

        if (signatures.length > 0) {
          return new Response(
            JSON.stringify({ error: 'Cannot cancel lease with existing signatures' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update status
        await supabaseClient
          .from('leases')
          .update({ status: 'CANCELED' })
          .eq('id', lease_id)

        // Log action
        await logLeaseAction(supabaseClient, lease_id, user.id, 'CANCELED')

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in lease management:', error)
    console.error('Error stack:', error.stack)
    
    // Ensure we always return valid JSON
    let errorMessage = 'Unknown error occurred'
    try {
      errorMessage = error.message || error.toString() || 'Unknown error occurred'
    } catch (e) {
      errorMessage = 'Error occurred but could not be serialized'
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: 'internal_server_error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

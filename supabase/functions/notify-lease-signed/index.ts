import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  tenancyId: string;
  signedBy: 'tenant' | 'landlord';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenancyId, signedBy }: NotificationRequest = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch tenancy details with property and user information
    const { data: tenancy, error: tenancyError } = await supabase
      .from('tenancies')
      .select(`
        *,
        properties!inner (
          title,
          location
        ),
        tenant_profile:profiles!fk_tenancies_tenant (
          display_name,
          user_id
        ),
        landlord_profile:profiles!fk_tenancies_landlord (
          display_name,
          user_id
        )
      `)
      .eq('id', tenancyId)
      .single();

    if (tenancyError) {
      throw new Error(`Failed to fetch tenancy: ${tenancyError.message}`);
    }

    console.log('Tenancy found:', tenancy);

    // Determine notification recipient and message
    let recipientId: string;
    let notificationTitle: string;
    let notificationMessage: string;

    if (signedBy === 'tenant') {
      recipientId = tenancy.landlord_id;
      notificationTitle = 'Tenant Signed Lease Agreement';
      notificationMessage = `${tenancy.tenant_profile?.display_name || 'Tenant'} has signed the lease agreement for ${tenancy.properties?.title}. The lease is ${tenancy.lease_status === 'completed' ? 'now fully executed' : 'awaiting your signature'}.`;
    } else {
      recipientId = tenancy.tenant_id;
      notificationTitle = 'Landlord Signed Lease Agreement';
      notificationMessage = `Your landlord has signed the lease agreement for ${tenancy.properties?.title}. The lease is ${tenancy.lease_status === 'completed' ? 'now fully executed' : 'awaiting your signature'}.`;
    }

    // For now, we'll just log the notification
    // In a real implementation, you would send emails using Resend or create in-app notifications
    console.log('Notification would be sent:', {
      recipientId,
      tenancyId,
      title: notificationTitle,
      message: notificationMessage,
      propertyTitle: tenancy.properties?.title,
      leaseStatus: tenancy.lease_status
    });

    // TODO: Implement actual email sending using Resend
    // This would require the RESEND_API_KEY secret to be configured
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification logged successfully',
        notification: {
          recipientId,
          title: notificationTitle,
          message: notificationMessage
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in notify-lease-signed function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
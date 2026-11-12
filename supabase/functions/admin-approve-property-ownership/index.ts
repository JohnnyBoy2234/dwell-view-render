import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveRequest {
  property_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting property ownership approval process');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }
    console.log('✅ Auth header found');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('✅ Supabase clients initialized');

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error('Authentication failed');
    }
    console.log('✅ User authenticated:', user.id);

    const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin', {
      user_id: user.id
    });
    if (adminCheckError || !isAdmin) {
      console.error('❌ Admin check failed:', adminCheckError);
      throw new Error('Admin access required');
    }
    console.log('✅ Admin access verified');

    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const { property_id }: ApproveRequest = await req.json();
    console.log('✅ Request body parsed, property_id:', property_id);

    if (!property_id) {
      throw new Error('property_id is required');
    }

    console.log('🔍 Fetching property:', property_id);
    const { data: property, error: propertyError } = await supabaseAdmin
      .from('properties')
      .select('id, title, ownership_status, title_deed_path, is_listed, landlord_id')
      .eq('id', property_id)
      .single();

    if (propertyError || !property) {
      console.error('❌ Property not found:', propertyError);
      throw new Error('Property not found');
    }
    console.log('✅ Property found, ownership_status:', property.ownership_status);

    if (property.ownership_status !== 'submitted') {
      throw new Error('Property is not in submitted status');
    }
    if (!property.title_deed_path) {
      throw new Error('No title deed on file for this property');
    }

    console.log('📝 Updating property ownership_status to verified');
    const { error: updateError } = await supabaseAdmin
      .from('properties')
      .update({
        ownership_status: 'verified',
        ownership_verified_at: new Date().toISOString(),
        ownership_reviewed_by: user.id,
        ownership_decline_reason: null,
      })
      .eq('id', property_id);

    if (updateError) {
      console.error('❌ Failed to update property:', updateError);
      throw updateError;
    }
    console.log('✅ Property ownership_status updated to verified');

    // Ownership was the landlord-facing "Under Review" gate — once it's
    // verified, automatically attempt to go live too, so the landlord
    // doesn't have to come back and click Publish again. This is a plain
    // attempt, not a guarantee: enforce_publish_paywall still runs on this
    // UPDATE and will reject it with IDENTITY_NOT_VERIFIED or
    // PUBLISH_PAYWALL if those gates aren't satisfied yet, in which case we
    // just leave the property unpublished — approving ownership itself has
    // already succeeded above regardless of this outcome.
    const title = property.title || 'listing';
    let autoPublished = false;
    if (property.is_listed) {
      // Already live from an earlier approval/payment race — no gate left to
      // attempt, and no "it's live" notification needed since it already is.
      autoPublished = true;
    } else {
      console.log('📝 Attempting auto-publish now that ownership is verified');
      const { error: publishError } = await supabaseAdmin
        .from('properties')
        .update({ is_listed: true })
        .eq('id', property_id);
      if (publishError) {
        console.log('ℹ️ Auto-publish not possible yet:', publishError.message);
        // The deed was still verified — the landlord must hear that now,
        // not silently find out later. Give them the precise next step
        // instead of a generic "still pending" message.
        const reason = publishError.message || '';
        const nextStep = reason.includes('IDENTITY_NOT_VERIFIED')
          ? 'Complete your ID verification to publish it.'
          : reason.includes('PUBLISH_PAYWALL')
          ? 'Complete payment to publish it.'
          : 'Finish the remaining steps to publish it.';
        await supabaseAdmin.rpc('create_notification', {
          _user_id: property.landlord_id,
          _message: `Your title deed for "${title}" has been verified! ${nextStep}`,
          _link_url: '/landlord/dashboard',
          _type: 'system',
          _metadata: { property_id, ownership_verified: true },
        });
      } else {
        autoPublished = true;
        console.log('✅ Property auto-published');
        // A distinct notification from the ownership-verified one above, so
        // the landlord's dashboard can tell "deed verified, still need other
        // steps" apart from "it's actually live now" and show the right
        // popup for each (see landlord-property-published-popup channel).
        await supabaseAdmin.rpc('create_notification', {
          _user_id: property.landlord_id,
          _message: `Your property "${title}" is now published on MzanziHomes!`,
          _link_url: '/landlord/dashboard',
          _type: 'system',
          _metadata: { property_id, auto_published: true },
        });
      }
    }

    console.log('📊 Logging telemetry event');
    await supabaseAdmin.rpc('log_event', {
      _user_id: user.id,
      _name: 'property_ownership_verified',
      _properties: { property_id, reviewed_by: user.id, auto_published: autoPublished },
    });
    console.log('✅ Telemetry event logged');

    console.log('🎉 Property ownership approval process completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Ownership verified', property_id, auto_published: autoPublished }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('💥 Error in admin-approve-property-ownership function:', error);
    console.error('💥 Error stack:', error.stack);

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

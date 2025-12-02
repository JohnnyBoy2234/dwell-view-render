import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { paymentId, ocrData, confidence, proofId } = await req.json();

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*, tenancies!inner(reference_code, monthly_rent)')
      .eq('id', paymentId)
      .single();

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Validation checks
    const expectedAmount = payment.expected_amount_cents / 100;
    const extractedAmount = ocrData.amount;
    const amountTolerance = 5;
    const amountMatch = Math.abs(extractedAmount - expectedAmount) <= amountTolerance;

    // Reference matching (fuzzy)
    const referenceMatch = payment.tenancies.reference_code && 
      ocrData.reference?.toLowerCase().includes(payment.tenancies.reference_code.toLowerCase());

    // Date validation (within ±3 days of due date)
    const dueDate = new Date(payment.due_date);
    const extractedDate = new Date(ocrData.date);
    const daysDiff = Math.abs((extractedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const dateMatch = daysDiff <= 3;

    // Calculate final confidence
    let finalConfidence = confidence;
    if (!amountMatch) finalConfidence -= 0.3;
    if (!referenceMatch) finalConfidence -= 0.2;
    if (!dateMatch) finalConfidence -= 0.1;

    // Determine status
    let status = 'failed';
    let shouldAwardStar = false;
    
    if (finalConfidence >= 0.9 && amountMatch && dateMatch) {
      status = 'verified';
      // Check if payment was on-time or early
      const paymentDate = new Date(ocrData.date);
      const daysEarly = Math.floor((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      shouldAwardStar = daysEarly >= 0; // On-time or early
    } else if (finalConfidence >= 0.6) {
      status = 'processing';
    }

    // Update payment
    await supabase
      .from('payments')
      .update({
        status,
        verification_confidence: finalConfidence,
        ocr_extracted_data: ocrData,
        paid_amount_cents: Math.round(extractedAmount * 100),
        paid_at: ocrData.date,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    // Log audit
    await supabase
      .from('payment_audit_logs')
      .insert({
        payment_id: paymentId,
        actor_user_id: user.id,
        action: 'ocr_verification',
        new_status: status,
        payload: { confidence: finalConfidence, amountMatch, referenceMatch, dateMatch }
      });

    // Award star if applicable
    let starAwarded = false;
    let badgeUnlocked = false;
    let badgeData = null;

    if (shouldAwardStar && status === 'verified') {
      const paymentDate = new Date(ocrData.date);
      const year = paymentDate.getFullYear();
      const month = paymentDate.getMonth() + 1;
      const daysEarly = Math.floor((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

      const { data: star, error: starError } = await supabase
        .from('tenant_payment_stars')
        .insert({
          tenant_id: payment.tenant_id,
          payment_id: paymentId,
          year,
          month,
          payment_date: ocrData.date,
          was_early: daysEarly > 0,
          days_early: Math.max(0, daysEarly)
        })
        .select()
        .single();

      if (!starError && star) {
        starAwarded = true;

        // Check if badge should be unlocked (triggers are in place but we'll check here too)
        const { data: yearStars } = await supabase
          .from('tenant_payment_stars')
          .select('id')
          .eq('tenant_id', payment.tenant_id)
          .eq('year', year);

        if (yearStars && yearStars.length >= 12) {
          const { data: badge } = await supabase
            .from('tenant_badges')
            .select('*')
            .eq('tenant_id', payment.tenant_id)
            .eq('badge_type', 'reliable_tenant')
            .eq('badge_year', year)
            .single();

          if (badge) {
            badgeUnlocked = true;
            badgeData = badge;
          }
        }
      }
    }

    // Create receipt if verified
    let receiptUrl = null;
    if (status === 'verified') {
      // Receipt generation would go here
      // For now, we'll just mark it as needed
      receiptUrl = 'pending';
    }

    // Notify landlord
    if (status === 'verified') {
      await supabase.rpc('create_notification', {
        _user_id: payment.landlord_id,
        _message: `Payment received from tenant for ${payment.due_period_yyyymm}`,
        _link_url: '/enhancedlandlorddashboard?tab=payments',
        _type: 'payment',
        _metadata: { payment_id: paymentId }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      status,
      confidence: finalConfidence,
      starAwarded,
      badgeUnlocked,
      badgeData,
      receiptUrl,
      checks: { amountMatch, referenceMatch, dateMatch }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

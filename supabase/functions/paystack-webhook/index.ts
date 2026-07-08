import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lightweight structured logger for the monetization branches (mirrors the
// file's existing console.* logging; never throws).
function logStep(message: string, details?: Record<string, unknown>) {
  console.log(`[paystack-webhook] ${message}`, details ? JSON.stringify(details) : '');
}

// Mark a landlord as an active subscriber and mirror into billing_subscriptions.
async function activateSubscription(
  supabase: any,
  userId: string,
  fields: { customerCode?: string; subscriptionCode?: string; periodEnd?: string | null },
) {
  const periodEnd = fields.periodEnd
    ?? new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(); // fallback: paid_at + 35d
  const { error: subError } = await supabase.from("billing_subscriptions").upsert({
    user_id: userId,
    plan_code: "subscriber",
    status: "active",
    provider: "paystack",
    current_period_end: periodEnd,
    ...(fields.customerCode ? { paystack_customer_code: fields.customerCode } : {}),
    ...(fields.subscriptionCode ? { paystack_subscription_code: fields.subscriptionCode } : {}),
  }, { onConflict: "user_id" });
  if (subError) {
    // Fail loudly: the webhook returns 500 so Paystack retries. The upsert is idempotent.
    throw new Error(`billing_subscriptions upsert failed for ${userId}: ${subError.message}`);
  }
  // The DB trigger on billing_subscriptions syncs profiles.plan; update directly too
  // in case the trigger is ever disabled.
  const { error: profileError } = await supabase.from("profiles").update({
    plan: "subscriber",
    plan_status: "active",
    plan_expires_at: periodEnd,
    plan_last_synced: new Date().toISOString(),
  }).eq("user_id", userId);
  if (profileError) {
    throw new Error(`profiles plan update failed for ${userId}: ${profileError.message}`);
  }
}

async function resolveUserByCustomerCode(supabase: any, customerCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("billing_subscriptions")
    .select("user_id")
    .eq("paystack_customer_code", customerCode)
    .maybeSingle();
  if (error) logStep("resolveUserByCustomerCode query failed", { customerCode, error: error.message });
  return data?.user_id ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();
    
    // Use Web Crypto API to verify HMAC
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecret);
    const messageData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hash !== signature) {
      throw new Error('Invalid signature');
    }

    const event = JSON.parse(body);

    // Handle successful payment
    if (event.event === 'charge.success') {
      const { reference, amount, paid_at, transaction } = event.data;

      // Monthly bill payment? (references are BILL_<uuid>_<ts>)
      if (reference?.startsWith('BILL_')) {
        // The reference column can be overwritten by a re-initialized checkout,
        // so resolve the bill by metadata first, then by parsing the reference,
        // and only then by the stored column.
        const metadataBillId = event.data.metadata?.bill_id as string | undefined;
        const parsedBillId = reference.split('_')[1];
        const billId = metadataBillId || parsedBillId;

        let bill = null;
        if (billId) {
          const { data } = await supabase
            .from('monthly_bills')
            .select('id, status, tenant_id, period, total_amount')
            .eq('id', billId)
            .single();
          bill = data;
        }
        if (!bill) {
          const { data } = await supabase
            .from('monthly_bills')
            .select('id, status, tenant_id, period, total_amount')
            .eq('paystack_reference', reference)
            .single();
          bill = data;
        }

        if (!bill) {
          console.error('Bill not found for reference:', reference);
          return new Response('Bill not found', { status: 404 });
        }
        if (bill.status === 'paid') {
          return new Response('Already processed', { status: 200, headers: corsHeaders });
        }

        // Verify the charged amount matches the bill before marking paid.
        const expectedCents = Math.round(Number(bill.total_amount) * 100);
        if (typeof amount === 'number' && amount !== expectedCents) {
          console.error('Bill amount mismatch — not marking paid', {
            billId: bill.id, expectedCents, receivedCents: amount, reference,
          });
          return new Response('Amount mismatch', { status: 200, headers: corsHeaders });
        }

        const { data: updated, error: updateError } = await supabase
          .from('monthly_bills')
          .update({ status: 'paid', paid_at: paid_at ?? new Date().toISOString() })
          .eq('id', bill.id)
          .eq('status', 'sent') // idempotency guard for duplicate deliveries
          .select('id');
        if (updateError) {
          console.error('Failed to mark bill paid:', updateError.message);
          return new Response('Update failed', { status: 500 });
        }
        if (!updated || updated.length === 0) {
          // Lost a concurrent race or bill not in 'sent' — nothing more to do.
          return new Response('Already processed', { status: 200, headers: corsHeaders });
        }

        const { error: notifyError } = await supabase.rpc('create_notification', {
          _user_id: bill.tenant_id,
          _message: `Payment confirmed — your ${bill.period} bill is settled. Receipt on its way.`,
          _link_url: '/enhancedtenantdashboard/payments',
          _type: 'payment',
          _metadata: { bill_id: bill.id },
        });
        if (notifyError) console.error('Bill payment notification failed (non-fatal):', notifyError.message);

        // Receipt + emails + landlord notification + SwiftBooks (own function, retryable).
        // Awaited so the edge runtime doesn't kill it, but failures never fail the webhook.
        const receiptRes = await fetch(`${supabaseUrl}/functions/v1/generate-rent-receipt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ billId: bill.id }),
        });
        if (!receiptRes.ok) {
          console.error('Receipt generation failed (bill stays paid):', await receiptRes.text());
        }

        return new Response('Bill payment processed', { status: 200, headers: corsHeaders });
      } else if (reference?.startsWith('LISTING_')) {
        const propertyId = event.data?.metadata?.property_id
          ?? reference.split("_")[1] ?? null;
        const landlordId = event.data?.metadata?.landlord_id ?? null;
        if (!propertyId || !landlordId) {
          logStep("LISTING_ missing metadata", { reference });
        } else if (amount !== 9900) {
          logStep("LISTING_ amount mismatch", { reference, amount });
        } else {
          // 1) Record the payment (idempotent), 2) publish — order matters: the
          // publish trigger checks listing_payments.
          const { error: feeErr } = await supabase.from("listing_payments").upsert({
            property_id: propertyId,
            landlord_id: landlordId,
            amount: amount / 100,
            paystack_reference: reference,
          }, { onConflict: "property_id", ignoreDuplicates: true });
          if (feeErr) {
            // Fail loudly: 500 makes Paystack retry; the upsert is idempotent.
            throw new Error(`LISTING_ listing_payments upsert failed: ${feeErr.message}`);
          }
          const { error: pubErr } = await supabase
            .from("properties")
            .update({ is_listed: true })
            .eq("id", propertyId);
          if (pubErr) {
            logStep("LISTING_ publish failed", { propertyId, error: pubErr.message });
            return new Response('Listing publish failed', { status: 500 });
          }
          await supabase.rpc("create_notification", {
            _user_id: landlordId,
            _message: "Payment received — your listing is now live on MzanziHomes.",
            _link_url: "/enhancedlandlorddashboard",
            _type: "billing",
            _metadata: { property_id: propertyId, reference },
          });
        }
      } else if (reference?.startsWith('SUB_') || event.data?.plan?.plan_code) {
        const customerCode = event.data?.customer?.customer_code;
        const landlordId = event.data?.metadata?.landlord_id
          ?? (customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null);
        if (!landlordId) {
          // Money was taken but we cannot grant the entitlement — fail loudly (500)
          // so Paystack retries instead of silently acknowledging with 200.
          throw new Error(`SUB charge: could not resolve user for reference ${reference}`);
        } else {
          // Persist the customer code on first activation (even when resolution came
          // via metadata.landlord_id) — renewals and subscription.disable/not_renew
          // events can only resolve the user by customer_code.
          if (!customerCode) {
            logStep("SUB charge: no customer_code in payload — lifecycle events may not resolve this user", { reference });
          }
          await activateSubscription(supabase, landlordId, {
            customerCode,
            periodEnd: null, // paid_at + 35d fallback; subscription.create refines it
          });
          // Optional auto-publish when the subscription was bought from the publish paywall.
          const propertyId = event.data?.metadata?.property_id;
          if (propertyId) {
            const { error: pubErr } = await supabase
              .from("properties").update({ is_listed: true }).eq("id", propertyId);
            if (pubErr) logStep("SUB publish failed", { propertyId, error: pubErr.message });
          }
          await supabase.rpc("create_notification", {
            _user_id: landlordId,
            _message: "Your MzanziHomes subscription is active. All landlord tools are unlocked.",
            _link_url: "/enhancedlandlorddashboard",
            _type: "billing",
            _metadata: { reference },
          });
        }
      } else {
        // Legacy rent-payment fallback: resolve by reference in the payments table.
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('paystack_reference', reference)
          .single();

        if (!payment) {
          console.error('Payment not found for reference:', reference);
          return new Response('Payment not found', { status: 404 });
        }

        // Update payment
        await supabase
          .from('payments')
          .update({
            status: 'verified',
            paid_amount_cents: amount,
            paid_at: paid_at,
            gateway_tx_id: transaction,
            verification_confidence: 1.0,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        // Award star for on-time/early payment
        const dueDate = new Date(payment.due_date);
        const paidDate = new Date(paid_at);
        const daysEarly = Math.floor((dueDate.getTime() - paidDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysEarly >= 0) {
          const year = paidDate.getFullYear();
          const month = paidDate.getMonth() + 1;

          await supabase
            .from('tenant_payment_stars')
            .insert({
              tenant_id: payment.tenant_id,
              payment_id: payment.id,
              year,
              month,
              payment_date: paid_at,
              was_early: daysEarly > 0,
              days_early: Math.max(0, daysEarly)
            });
        }

        // Notify both parties
        await supabase.rpc('create_notification', {
          _user_id: payment.tenant_id,
          _message: `Payment confirmed for ${payment.due_period_yyyymm}`,
          _link_url: '/enhancedtenantdashboard?tab=payments',
          _type: 'payment',
          _metadata: { payment_id: payment.id, star_awarded: daysEarly >= 0 }
        });

        await supabase.rpc('create_notification', {
          _user_id: payment.landlord_id,
          _message: `Payment received from tenant for ${payment.due_period_yyyymm}`,
          _link_url: '/enhancedlandlorddashboard?tab=payments',
          _type: 'payment',
          _metadata: { payment_id: payment.id }
        });

        // Log audit
        await supabase
          .from('payment_audit_logs')
          .insert({
            payment_id: payment.id,
            action: 'paystack_webhook',
            new_status: 'verified',
            payload: event.data
          });
      }
    } else if (event.event === "subscription.create") {
      const customerCode = event.data?.customer?.customer_code;
      const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
      if (userId) {
        await supabase.from("billing_subscriptions").update({
          paystack_subscription_code: event.data?.subscription_code,
          current_period_end: event.data?.next_payment_date ?? undefined,
        }).eq("user_id", userId);
        if (event.data?.next_payment_date) {
          await supabase.from("profiles").update({
            plan_expires_at: event.data.next_payment_date,
            plan_last_synced: new Date().toISOString(),
          }).eq("user_id", userId);
        }
      } else {
        logStep("subscription.create: unknown customer", { customerCode });
      }
    } else if (event.event === "subscription.not_renew") {
      const customerCode = event.data?.customer?.customer_code;
      const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
      if (userId) {
        await supabase.from("billing_subscriptions").update({ status: "non-renewing" }).eq("user_id", userId);
        await supabase.from("profiles").update({
          plan_status: "non-renewing",
          plan_last_synced: new Date().toISOString(),
        }).eq("user_id", userId);
      }
    } else if (event.event === "subscription.disable") {
      const customerCode = event.data?.customer?.customer_code;
      const userId = customerCode ? await resolveUserByCustomerCode(supabase, customerCode) : null;
      if (userId) {
        await supabase.from("billing_subscriptions").update({ status: "cancelled" }).eq("user_id", userId);
        await supabase.from("profiles").update({
          plan: "free",
          plan_status: "cancelled",
          plan_last_synced: new Date().toISOString(),
        }).eq("user_id", userId);
        // Paid R99 listings stay live: we never touch is_listed here.
      }
    }

    return new Response('Webhook processed', {
      status: 200,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

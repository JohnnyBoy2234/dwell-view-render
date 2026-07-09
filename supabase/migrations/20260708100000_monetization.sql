-- Monetization: two-tier plans (free / subscriber), publish paywall, listing fees, lead contact mode.

-- 1) Once-off listing-fee payments. One payment publishes one property forever.
CREATE TABLE IF NOT EXISTS public.listing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL,
  amount numeric NOT NULL,
  paystack_reference text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listing_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Landlords can view own listing payments" ON public.listing_payments;
CREATE POLICY "Landlords can view own listing payments"
  ON public.listing_payments FOR SELECT
  USING (auth.uid() = landlord_id);
-- No INSERT/UPDATE/DELETE policies: only the service role (webhook) writes.

-- 2) Paystack subscription linkage on the existing billing_subscriptions table.
ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS paystack_customer_code text,
  ADD COLUMN IF NOT EXISTS paystack_subscription_code text;

-- 3) Entitlement functions.
CREATE OR REPLACE FUNCTION public.is_active_subscriber(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND plan = 'subscriber'
      AND COALESCE(plan_status, 'active') IN ('active','trialing','past_due','non-renewing')
      AND (plan_expires_at IS NULL OR plan_expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_property(_property_id uuid, _landlord_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_subscriber(_landlord_id)
      OR EXISTS (SELECT 1 FROM public.listing_payments WHERE property_id = _property_id);
$$;

-- 4) Publish paywall trigger. Fires only on the false->true transition (or INSERT with true),
--    so properties that are already listed today are grandfathered and stay live.
--    The webhook inserts the listing_payments row BEFORE flipping is_listed, so the
--    service-role publish passes this check naturally.
CREATE OR REPLACE FUNCTION public.enforce_publish_paywall()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.is_listed IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_listed IS DISTINCT FROM TRUE) THEN
    IF NOT public.can_publish_property(NEW.id, NEW.landlord_id) THEN
      RAISE EXCEPTION 'PUBLISH_PAYWALL: publishing requires an active subscription or a once-off listing fee';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_publish_paywall ON public.properties;
CREATE TRIGGER trg_enforce_publish_paywall
  BEFORE INSERT OR UPDATE OF is_listed ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_publish_paywall();

-- New properties are drafts until paid/subscribed.
ALTER TABLE public.properties ALTER COLUMN is_listed SET DEFAULT false;

-- 5) Collapse legacy pro/premium into subscriber.
UPDATE public.profiles SET plan = 'subscriber' WHERE plan IN ('pro','premium');

-- 6) Replace the trigger fn that syncs profiles.plan from billing_subscriptions:
--    any active-ish subscription now maps to 'subscriber' regardless of plan_code.
CREATE OR REPLACE FUNCTION public.update_profile_plan_from_subscription()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('active','trialing','past_due','non-renewing') THEN
    UPDATE public.profiles
    SET plan = 'subscriber',
        plan_status = NEW.status,
        plan_expires_at = COALESCE(NEW.current_period_end, NEW.trial_end),
        plan_last_synced = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  ELSE
    UPDATE public.profiles
    SET plan = 'free',
        plan_status = NEW.status,
        plan_last_synced = now(),
        updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 7) Keep the legacy RLS helper consistent with the new tiers.
--    (Defined in 20251121120000_add_subscription_rls_policies.sql; level 2 satisfied
--    both the old 'pro' (1) and 'premium' (2) policies.)
CREATE OR REPLACE FUNCTION public.get_user_plan_level(user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_active_subscriber(user_id) THEN 2 ELSE 0 END;
$$;

-- 8) New conversations may only be created with subscribed landlords.
--    RESTRICTIVE: AND-ed with every existing permissive INSERT policy.
--    Existing conversations/messages are untouched, so lapsed landlords keep old threads.
DROP POLICY IF EXISTS "subscriber_landlord_new_conversations" ON public.conversations;
CREATE POLICY "subscriber_landlord_new_conversations"
  ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_active_subscriber(landlord_id));

-- 9) Contact mode for a listing: 'messaging' (subscriber landlord) or 'lead' (free landlord).
--    Callable by anon + authenticated so the tenant app can branch before contact.
CREATE OR REPLACE FUNCTION public.get_property_contact_mode(_property_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN public.is_active_subscriber(p.landlord_id) THEN 'messaging' ELSE 'lead' END
  FROM public.properties p
  WHERE p.id = _property_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_contact_mode(uuid) TO anon, authenticated;

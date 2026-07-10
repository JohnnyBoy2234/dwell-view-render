-- Create a function to get user's current plan level (0=free, 1=pro, 2=premium)
CREATE OR REPLACE FUNCTION public.get_user_plan_level(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  plan_level integer := 0; -- Default to free
  plan_code text;
BEGIN
  -- Get the most recent active subscription
  SELECT plan_code INTO plan_code
  FROM billing_subscriptions
  WHERE billing_subscriptions.user_id = user_id
    AND billing_subscriptions.status = 'active'
    AND (billing_subscriptions.ends_at IS NULL OR billing_subscriptions.ends_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- Map plan codes to levels
  IF plan_code IS NOT NULL THEN
    IF plan_code ILIKE '%premium%' THEN
      plan_level := 2;
    ELSIF plan_code ILIKE '%pro%' THEN
      plan_level := 1;
    END IF;
  END IF;

  RETURN plan_level;
END;
$$;

-- Create a function to check if user has at least the required plan
CREATE OR REPLACE FUNCTION public.has_subscription_access(user_id uuid, required_plan text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_plan_level integer;
  required_plan_level integer;
BEGIN
  -- Get user's plan level
  user_plan_level := public.get_user_plan_level(user_id);
  
  -- Map required plan to level
  required_plan_level := CASE 
    WHEN required_plan = 'premium' THEN 2
    WHEN required_plan = 'pro' THEN 1
    ELSE 0 -- free
  END;
  
  -- Check if user's plan meets or exceeds required plan
  RETURN user_plan_level >= required_plan_level;
END;
$$;

-- Enable RLS on relevant tables if not already enabled.
-- Guards added: all tables except maintenance_requests exist only remotely,
-- created outside migrations (remote history only tracks 20260707144339+), so
-- fresh local `supabase db reset` replay lacks them.
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
DO $do$
DECLARE tbl text;
BEGIN
FOREACH tbl IN ARRAY ARRAY['maintenance_responses','leases','lease_documents','property_inspections','rental_applications'] LOOP
  IF to_regclass('public.' || tbl) IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END IF;
END LOOP;
END $do$;

-- Maintenance Requests Policies
CREATE POLICY "Enable read access for users with premium subscription"
  ON public.maintenance_requests
  FOR SELECT
  USING (
    auth.uid() = tenant_id OR 
    auth.uid() = (SELECT landlord_id FROM properties WHERE id = property_id) OR
    public.has_subscription_access(auth.uid(), 'premium')
  );

CREATE POLICY "Enable insert for tenants with premium subscription"
  ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = tenant_id AND
    public.has_subscription_access(auth.uid(), 'premium')
  );

-- Maintenance Responses Policies (guarded: remote-only table, see note above)
DO $do$ BEGIN
IF to_regclass('public.maintenance_responses') IS NOT NULL THEN
  CREATE POLICY "Enable read access for related users with premium subscription"
    ON public.maintenance_responses
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM maintenance_requests mr 
        WHERE mr.id = maintenance_responses.request_id 
        AND (mr.tenant_id = auth.uid() OR 
             mr.landlord_id = auth.uid())
      ) AND
      public.has_subscription_access(auth.uid(), 'premium')
    );
END IF;
END $do$;

-- Leases Policies (guarded: remote-only table, see note above)
DO $do$ BEGIN
IF to_regclass('public.leases') IS NOT NULL THEN
  CREATE POLICY "Enable read access for related users with pro subscription"
    ON public.leases
    FOR SELECT
    USING (
      (tenant_id = auth.uid() OR landlord_id = auth.uid()) AND
      public.has_subscription_access(auth.uid(), 'pro')
    );
END IF;
END $do$;

-- Lease Documents Policies (guarded: remote-only tables, see note above)
DO $do$ BEGIN
IF to_regclass('public.lease_documents') IS NOT NULL AND to_regclass('public.leases') IS NOT NULL THEN
  CREATE POLICY "Enable read access for related users with pro subscription"
    ON public.lease_documents
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM leases l 
        WHERE l.id = lease_documents.lease_id 
        AND (l.tenant_id = auth.uid() OR l.landlord_id = auth.uid())
      ) AND
      public.has_subscription_access(auth.uid(), 'pro')
    );
END IF;
END $do$;

-- Property Inspections Policies (guarded: remote-only tables, see note above)
DO $do$ BEGIN
IF to_regclass('public.property_inspections') IS NOT NULL AND to_regclass('public.leases') IS NOT NULL THEN
  CREATE POLICY "Enable read access for related users with pro subscription"
    ON public.property_inspections
    FOR SELECT
    USING (
      (inspector_id = auth.uid() OR 
       property_id IN (SELECT id FROM properties WHERE landlord_id = auth.uid()) OR
       property_id IN (SELECT property_id FROM leases WHERE tenant_id = auth.uid() AND status = 'active')
      ) AND
      public.has_subscription_access(auth.uid(), 'pro')
    );
END IF;
END $do$;

-- Rental Applications Policies (guarded: remote-only table, see note above)
DO $do$ BEGIN
IF to_regclass('public.rental_applications') IS NOT NULL THEN
  CREATE POLICY "Enable read access for related users with pro subscription"
    ON public.rental_applications
    FOR SELECT
    USING (
      (applicant_id = auth.uid() OR 
       property_id IN (SELECT id FROM properties WHERE landlord_id = auth.uid())
      ) AND
      public.has_subscription_access(auth.uid(), 'pro')
    );
END IF;
END $do$;

-- Create a function to check subscription access for RLS
CREATE OR REPLACE FUNCTION public.check_subscription_access(required_plan text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN public.has_subscription_access(auth.uid(), required_plan);
END;
$$;

-- Add a comment to document the RLS policies
COMMENT ON FUNCTION public.get_user_plan_level IS 'Gets the subscription level (0=free, 1=pro, 2=premium) for a user';
COMMENT ON FUNCTION public.has_subscription_access IS 'Checks if a user has at least the required subscription level';
COMMENT ON FUNCTION public.check_subscription_access IS 'Wrapper function for RLS to check subscription access';

-- Create a policy to restrict access to the billing_subscriptions table
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own subscriptions"
  ON public.billing_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can only insert their own subscriptions"
  ON public.billing_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create a policy to restrict access to the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; -- dedup for local replay
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Create a policy to restrict access to the properties table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Guarded on leases (remote-only, see note above). Skipping is safe locally:
-- properties already has the permissive "Anyone can view available properties"
-- SELECT policy from 20250804103254, and policies are OR'd.
DO $do$ BEGIN
IF to_regclass('public.leases') IS NOT NULL THEN
  CREATE POLICY "Users can view properties they own or are tenants of"
    ON public.properties
    FOR SELECT
    USING (
      landlord_id = auth.uid() OR
      id IN (SELECT property_id FROM leases WHERE tenant_id = auth.uid() AND status = 'active')
    );
END IF;
END $do$;

-- Create a policy to restrict access to the messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Removed: messages has no recipient_id column anywhere (local migrations and
-- the generated remote types agree), so this CREATE POLICY could never have
-- applied. Kept as a record only.
-- CREATE POLICY "Users can view their own messages with pro subscription"
--   ON public.messages FOR SELECT
--   USING ((sender_id = auth.uid() OR recipient_id = auth.uid()) AND
--          public.has_subscription_access(auth.uid(), 'pro'));

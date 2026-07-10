-- Restrict public access to profiles while preserving legitimate access
-- 1) Remove overly permissive public SELECT policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 2) Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 3) Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- 4) Landlords can view tenant profiles of their applicants
CREATE POLICY "Landlords can view applicant profiles"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT a.tenant_id
    FROM public.applications a
    WHERE a.landlord_id = auth.uid()
  )
);

-- 5) Tenants can view landlord profiles they applied to
CREATE POLICY "Tenants can view landlord profiles for their applications"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT a.landlord_id
    FROM public.applications a
    WHERE a.tenant_id = auth.uid()
  )
);

-- 6) Users can view profiles of participants in their conversations
CREATE POLICY "Users can view profiles of conversation participants"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT c.landlord_id FROM public.conversations c WHERE c.tenant_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT c.tenant_id FROM public.conversations c WHERE c.landlord_id = auth.uid()
  )
);

-- 7) Users can view profiles linked via viewings
CREATE POLICY "Users can view profiles for viewings"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT v.landlord_id FROM public.viewings v WHERE v.tenant_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT v.tenant_id FROM public.viewings v WHERE v.landlord_id = auth.uid()
  )
);

-- 8) Users can view profiles linked via tenancies
CREATE POLICY "Users can view profiles for tenancies"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT t.landlord_id FROM public.tenancies t WHERE t.tenant_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT t.tenant_id FROM public.tenancies t WHERE t.landlord_id = auth.uid()
  )
);

-- 9) Users can view profiles linked via application invites
CREATE POLICY "Users can view profiles for application invites"
ON public.profiles
FOR SELECT
USING (
  user_id IN (
    SELECT ai.landlord_id FROM public.application_invites ai WHERE ai.tenant_id = auth.uid()
  )
  OR
  user_id IN (
    SELECT ai.tenant_id FROM public.application_invites ai WHERE ai.landlord_id = auth.uid()
  )
);

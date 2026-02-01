-- Fix RLS recursion for agency onboarding

-- Helper: is agency member for a given agency
CREATE OR REPLACE FUNCTION public.is_agency_member(_agency_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.agency_id = _agency_id
      AND m.user_id = _user_id
  );
$$;

-- Helper: is agency admin for a given agency (row_security disabled to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_agency_admin(_agency_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.agency_id = _agency_id
      AND m.user_id = _user_id
      AND m.role = 'agency_admin'
  );
$$;

-- Replace recursive policies
DROP POLICY IF EXISTS "Agency admins can view their agency" ON public.agencies;
CREATE POLICY "Agency admins can view their agency"
  ON public.agencies FOR SELECT
  USING (
    public.is_admin() OR
    public.is_agency_member(agencies.id)
  );

DROP POLICY IF EXISTS "Agency members can view agency membership" ON public.agency_members;
CREATE POLICY "Agency members can view agency membership"
  ON public.agency_members FOR SELECT
  USING (
    public.is_admin() OR
    public.is_agency_member(agency_members.agency_id)
  );

DROP POLICY IF EXISTS "Agency members can view agency documents" ON public.agency_documents;
CREATE POLICY "Agency members can view agency documents"
  ON public.agency_documents FOR SELECT
  USING (
    public.is_admin() OR
    public.is_agency_member(agency_documents.agency_id)
  );

DROP POLICY IF EXISTS "Agency members can view agency documents" ON storage.objects;
CREATE POLICY "Agency members can view agency documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agency-uploads'
    AND (
      public.is_admin() OR
      public.is_agency_member(((storage.foldername(name))[2])::uuid)
    )
  );

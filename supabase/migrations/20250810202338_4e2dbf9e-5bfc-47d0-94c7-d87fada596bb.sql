-- Fix the search path issue in the function
CREATE OR REPLACE FUNCTION public.can_create_application(viewing_uuid UUID, landlord_uuid UUID, tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.viewings
    WHERE id = viewing_uuid
      AND landlord_id = landlord_uuid
      AND tenant_id = tenant_uuid
      AND status = 'completed'
      AND completed_at IS NOT NULL
  )
$$;
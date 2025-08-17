-- Broaden tenant DELETE rights to all non-accepted applications to avoid duplicate key issues
DROP POLICY IF EXISTS "Tenants can delete their re-applicable applications" ON public.applications;

CREATE POLICY "Tenants can delete any non-accepted application"
ON public.applications
FOR DELETE
USING (
  auth.uid() = tenant_id
  AND status <> 'accepted'
);

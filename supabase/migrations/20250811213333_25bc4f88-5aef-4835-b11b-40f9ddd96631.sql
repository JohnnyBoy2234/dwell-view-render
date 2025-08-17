-- Expand delete permissions so tenants can re-submit applications when not accepted
-- Safely replace the previous pending-only policy
DROP POLICY IF EXISTS "Tenants can delete their own pending applications" ON public.applications;

CREATE POLICY "Tenants can delete their re-applicable applications"
ON public.applications
FOR DELETE
USING (
  auth.uid() = tenant_id
  AND status IN ('pending', 'pending_credit_check', 'declined')
);

-- Note: Landlords remain the only ones who can UPDATE statuses; INSERT/SELECT policies unchanged.

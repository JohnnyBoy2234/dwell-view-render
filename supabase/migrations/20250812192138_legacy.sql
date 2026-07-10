-- Allow landlords to view screening details of their applicants
-- without changing existing self-access policy

-- Ensure the base policy remains for users managing their own details (already exists)
-- Add landlord SELECT access via applications relationship
CREATE POLICY IF NOT EXISTS "Landlords can view applicant screening details"
ON public.screening_details
FOR SELECT
USING (
  user_id IN (
    SELECT a.tenant_id
    FROM public.applications a
    WHERE a.landlord_id = auth.uid()
  )
);

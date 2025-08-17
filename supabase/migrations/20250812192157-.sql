-- Add landlord read access to applicants' screening_details
CREATE POLICY "Landlords can view applicant screening details"
ON public.screening_details
FOR SELECT
USING (
  user_id IN (
    SELECT a.tenant_id
    FROM public.applications a
    WHERE a.landlord_id = auth.uid()
  )
);

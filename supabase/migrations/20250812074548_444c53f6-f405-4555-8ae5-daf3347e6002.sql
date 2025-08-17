-- Ensure unique screening_details per user for safe upserts
DO $$ BEGIN
IF NOT EXISTS (
  SELECT 1 FROM pg_constraint 
  WHERE conname = 'screening_details_user_id_key'
) THEN
  ALTER TABLE public.screening_details
  ADD CONSTRAINT screening_details_user_id_key UNIQUE (user_id);
END IF;
END $$;

-- Allow landlords to view documents for their applicants
DROP POLICY IF EXISTS "Landlords can view applicant documents" ON public.documents;
CREATE POLICY "Landlords can view applicant documents"
ON public.documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.tenant_id = user_id
      AND a.landlord_id = auth.uid()
  )
);

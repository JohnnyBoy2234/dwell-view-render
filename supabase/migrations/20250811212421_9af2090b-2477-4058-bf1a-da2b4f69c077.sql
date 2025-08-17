-- Allow tenants to delete their own pending applications so duplicate submissions can be handled seamlessly
-- This enables the existing client flow (delete + insert) without exposing other operations

-- Create RLS policy for DELETE on applications
CREATE POLICY "Tenants can delete their own pending applications"
ON public.applications
FOR DELETE
USING (
  auth.uid() = tenant_id
  AND status = 'pending'
);

-- Note: We intentionally do NOT allow tenants to UPDATE applications to keep status control with landlords.
-- Existing INSERT and SELECT policies already enforce tenant-only creation and visibility.

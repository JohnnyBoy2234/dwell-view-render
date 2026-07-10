-- Simplify tenant UPDATE permissions to fix RLS violation when signing
DROP POLICY IF EXISTS "Tenants can sign their leases" ON public.tenancies;

CREATE POLICY "Tenants can update their own tenancies"
ON public.tenancies
AS PERMISSIVE
FOR UPDATE
USING (auth.uid() = tenant_id)
WITH CHECK (auth.uid() = tenant_id);

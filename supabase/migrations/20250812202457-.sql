-- Allow tenants to update their own tenancy for signing progression
-- Adds an UPDATE policy so tenant can set their signature fields and advance status

CREATE POLICY "Tenants can sign their leases"
ON public.tenancies
FOR UPDATE
USING (auth.uid() = tenant_id)
WITH CHECK (
  auth.uid() = tenant_id
  AND (
    -- Tenant signs first -> awaiting landlord
    (lease_status = 'awaiting_landlord_signature' AND tenant_signature_url IS NOT NULL AND tenant_signed_at IS NOT NULL)
    OR
    -- Landlord already signed -> tenant completes
    (lease_status = 'completed' AND tenant_signature_url IS NOT NULL AND tenant_signed_at IS NOT NULL)
    OR
    -- In edge cases, allow remaining in awaiting_tenant_signature while uploading signature metadata
    (lease_status = 'awaiting_tenant_signature' AND tenant_signature_url IS NOT NULL AND tenant_signed_at IS NOT NULL)
  )
);

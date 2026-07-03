-- Inventory photos/voice notes are uploaded to the private kyc-uploads bucket
-- under inventory/{tenantUserId}/{propertyId}/{recordId}/{noteId}/{filename}, to
-- avoid landlord-restrictive policies on other buckets. But kyc-uploads' own
-- SELECT policy only allows the uploading user or admins, so landlords could
-- never actually view the inventory their tenants submitted. This adds a
-- narrowly-scoped read policy (inventory/ prefix only, ownership checked via
-- the property's landlord_id) without touching KYC identity document access.

CREATE POLICY "Landlords can view their properties' inventory uploads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'kyc-uploads'
  AND (string_to_array(name, '/'))[1] = 'inventory'
  AND EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id::text = (string_to_array(name, '/'))[3]
    AND properties.landlord_id = auth.uid()
  )
);

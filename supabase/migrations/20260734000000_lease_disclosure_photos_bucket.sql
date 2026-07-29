-- Storage for PPA §67 disclosure photo evidence attached to flagged lease
-- condition items. Private bucket; a landlord owns files under a folder named
-- with their auth uid (path: {uid}/{contractId}/{itemKey}/{ts}_{name}). The
-- lease PDF generator reads these with the service role when embedding them as
-- annexures, so no tenant-facing storage policy is needed here.

INSERT INTO storage.buckets (id, name, public)
VALUES ('lease-disclosure-photos', 'lease-disclosure-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners manage their lease disclosure photos"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'lease-disclosure-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'lease-disclosure-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

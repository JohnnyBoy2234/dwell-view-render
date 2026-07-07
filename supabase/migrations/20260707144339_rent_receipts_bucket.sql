-- Create storage bucket for rent receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('rent-receipts', 'rent-receipts', true, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for rent receipts storage
-- Receipts are written only by the service role (which bypasses RLS);
-- public read is required for emailed receipt links.
DROP POLICY IF EXISTS "Public can view rent receipts" ON storage.objects;
CREATE POLICY "Public can view rent receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'rent-receipts');

DROP POLICY IF EXISTS "System can upload rent receipts" ON storage.objects;
CREATE POLICY "System can upload rent receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rent-receipts');

DROP POLICY IF EXISTS "System can update rent receipts" ON storage.objects;
CREATE POLICY "System can update rent receipts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'rent-receipts');

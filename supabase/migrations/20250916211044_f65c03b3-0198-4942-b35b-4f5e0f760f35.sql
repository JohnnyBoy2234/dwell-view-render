-- Create storage bucket for lease documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('lease-documents', 'lease-documents', true, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for lease documents storage
CREATE POLICY "Users can view lease documents they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lease-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM lease_contracts 
    WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
  )
);

CREATE POLICY "System can upload lease documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lease-documents');

CREATE POLICY "System can update lease documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lease-documents');
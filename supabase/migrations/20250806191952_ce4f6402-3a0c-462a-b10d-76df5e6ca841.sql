-- Create storage policies for lease documents
CREATE POLICY "Landlords can upload lease documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Landlords can read their lease documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lease-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Tenants can read lease documents in their folders" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lease-documents');
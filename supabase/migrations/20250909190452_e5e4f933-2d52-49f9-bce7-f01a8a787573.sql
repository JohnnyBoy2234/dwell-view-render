-- Fix storage policies for kyc-uploads bucket
-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-uploads', 'kyc-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Create proper RLS policies for kyc-uploads bucket
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc-uploads' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

CREATE POLICY "Users can view their own KYC documents"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc-uploads' 
  AND (
    auth.uid()::text = (string_to_array(name, '/'))[2]
    OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);

CREATE POLICY "Admins can view all KYC documents"
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'kyc-uploads' 
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create policy for users to update their own KYC documents
CREATE POLICY "Users can update their own KYC documents"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'kyc-uploads' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Create policy for users to delete their own KYC documents
CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'kyc-uploads' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);
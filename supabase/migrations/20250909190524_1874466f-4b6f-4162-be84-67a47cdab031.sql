-- Drop existing policies and recreate them properly
DROP POLICY IF EXISTS "Users can upload their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own KYC documents" ON storage.objects;

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

CREATE POLICY "Users can update their own KYC documents"
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'kyc-uploads' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'kyc-uploads' 
  AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

-- Add columns for front and back of ID to kyc_profiles
ALTER TABLE kyc_profiles ADD COLUMN IF NOT EXISTS id_front_path text;
ALTER TABLE kyc_profiles ADD COLUMN IF NOT EXISTS id_back_path text;

-- Update existing id_doc_path to id_front_path for backward compatibility
UPDATE kyc_profiles SET id_front_path = id_doc_path WHERE id_doc_path IS NOT NULL AND id_front_path IS NULL;
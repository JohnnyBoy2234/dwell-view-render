-- Create RLS policies for income-documents storage bucket
CREATE POLICY "Users can upload their own income documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'income-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own income documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'income-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own income documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'income-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own income documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'income-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create RLS policies for id-documents storage bucket
CREATE POLICY "Users can upload their own ID documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own ID documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own ID documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own ID documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add documents column to screening_profiles to track uploaded documents
ALTER TABLE public.screening_profiles 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;
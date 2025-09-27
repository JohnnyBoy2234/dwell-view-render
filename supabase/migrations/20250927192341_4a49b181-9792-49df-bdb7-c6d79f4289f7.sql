-- Create storage bucket for maintenance images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('maintenance-images', 'maintenance-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for maintenance images
CREATE POLICY "Authenticated users can upload maintenance images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'maintenance-images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view maintenance images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'maintenance-images');

CREATE POLICY "Users can update their own maintenance images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'maintenance-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own maintenance images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'maintenance-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
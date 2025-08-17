-- Add documents column to screening_profiles to track uploaded documents
ALTER TABLE public.screening_profiles 
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;
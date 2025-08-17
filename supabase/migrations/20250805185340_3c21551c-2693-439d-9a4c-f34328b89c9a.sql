-- Create screening_profiles table for detailed tenant applications
CREATE TABLE public.screening_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Personal information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  
  -- Household information
  occupants JSONB DEFAULT '[]'::jsonb, -- Array of {name, relationship}
  has_pets BOOLEAN DEFAULT false,
  pet_details TEXT,
  
  -- Income information
  income_sources JSONB DEFAULT '[]'::jsonb, -- Array of income source objects
  
  -- Residence information
  residences JSONB DEFAULT '[]'::jsonb, -- Array of residence objects (current and previous)
  
  -- Screening consent
  screening_consent BOOLEAN NOT NULL DEFAULT false,
  screening_consent_date TIMESTAMP WITH TIME ZONE,
  
  -- Application status
  is_complete BOOLEAN NOT NULL DEFAULT false,
  
  UNIQUE(user_id)
);

-- Enable RLS on screening_profiles
ALTER TABLE public.screening_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for screening_profiles
CREATE POLICY "Users can manage their own screening profile"
ON public.screening_profiles
FOR ALL
USING (auth.uid() = user_id);

-- Create policy for landlords to view screening profiles of applicants
CREATE POLICY "Landlords can view screening profiles of their applicants"
ON public.screening_profiles
FOR SELECT
USING (
  user_id IN (
    SELECT applications.tenant_id
    FROM applications
    WHERE applications.landlord_id = auth.uid()
  )
);

-- Create storage bucket for income documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('income-documents', 'income-documents', false);

-- Create storage policies for income documents
CREATE POLICY "Users can upload their own income documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'income-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own income documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'income-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Landlords can view income documents of their applicants"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'income-documents' AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT applications.tenant_id
    FROM applications
    WHERE applications.landlord_id = auth.uid()
  )
);

-- Create updated_at trigger for screening_profiles
CREATE TRIGGER update_screening_profiles_updated_at
BEFORE UPDATE ON public.screening_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
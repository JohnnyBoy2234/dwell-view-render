
-- Create properties table with sales support
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  property_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  parking_spaces INTEGER NOT NULL DEFAULT 0,
  size_sqm INTEGER,
  furnished BOOLEAN DEFAULT false,
  pets_allowed BOOLEAN DEFAULT false,
  available_from DATE,
  images TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'under_offer', 'maintenance', 'unlisted', 'sold')),
  featured BOOLEAN DEFAULT false,
  -- Sales support columns
  listing_type TEXT NOT NULL DEFAULT 'rent' CHECK (listing_type IN ('rent', 'sale')),
  sale_price NUMERIC,
  price_negotiable BOOLEAN DEFAULT false,
  levy_amount NUMERIC,
  rates_taxes NUMERIC,
  erf_size NUMERIC,
  transfer_duty_estimate NUMERIC,
  occupation_date DATE,
  -- Agency support
  agent_id UUID,
  agency_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view available properties"
ON public.properties FOR SELECT
USING (status = 'available' OR auth.uid() = landlord_id);

CREATE POLICY "Landlords can create properties"
ON public.properties FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their properties"
ON public.properties FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Landlords can delete their properties"
ON public.properties FOR DELETE
USING (auth.uid() = landlord_id);

-- Indexes
CREATE INDEX idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX idx_properties_status ON public.properties(status);
CREATE INDEX idx_properties_location ON public.properties(location);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Property images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-images');

CREATE POLICY "Users can upload property images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their property images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their property images"
ON storage.objects FOR DELETE
USING (bucket_id = 'property-images' AND auth.uid() IS NOT NULL);

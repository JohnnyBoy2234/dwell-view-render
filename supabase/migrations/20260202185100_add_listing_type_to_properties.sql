-- Add support for rent vs sale listings, and agency/agent ownership

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'property_listing_type'
  ) THEN
    CREATE TYPE public.property_listing_type AS ENUM ('rent', 'sale');
  END IF;
END $$;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_type public.property_listing_type NOT NULL DEFAULT 'rent';

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON public.properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties(agency_id);
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON public.properties(agent_id);

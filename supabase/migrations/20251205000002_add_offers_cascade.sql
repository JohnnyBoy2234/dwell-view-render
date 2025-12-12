-- Add CASCADE delete to offers table for consistency
-- This ensures offers are automatically deleted when a property is deleted

-- First, drop the existing foreign key constraint if it exists
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'offers' 
    AND constraint_name LIKE '%listing_id%'
  ) THEN
    ALTER TABLE public.offers 
    DROP CONSTRAINT IF EXISTS offers_listing_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint with CASCADE
ALTER TABLE public.offers
ADD CONSTRAINT offers_listing_id_fkey
FOREIGN KEY (listing_id) 
REFERENCES public.properties(id) 
ON DELETE CASCADE;


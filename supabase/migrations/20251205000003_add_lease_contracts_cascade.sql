-- Add CASCADE delete to lease_contracts table for consistency
-- This ensures lease contracts are automatically deleted when a property is deleted

-- Check if lease_contracts table exists and has the foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'lease_contracts'
  ) THEN
    -- Drop existing foreign key constraint if it exists (may not have a specific name)
    ALTER TABLE public.lease_contracts 
    DROP CONSTRAINT IF EXISTS lease_contracts_property_id_fkey;
    
    -- Add the foreign key constraint with CASCADE
    ALTER TABLE public.lease_contracts
    ADD CONSTRAINT lease_contracts_property_id_fkey
    FOREIGN KEY (property_id) 
    REFERENCES public.properties(id) 
    ON DELETE CASCADE;
  END IF;
END $$;


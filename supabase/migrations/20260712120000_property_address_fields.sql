-- Structured address for listings. All nullable: existing rows and the sale
-- flow are unaffected; requiredness is enforced by wizard validation.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS suburb text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS postal_code text;

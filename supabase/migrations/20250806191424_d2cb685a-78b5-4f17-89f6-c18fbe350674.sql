-- Make end_date nullable for month-to-month leases
ALTER TABLE public.tenancies ALTER COLUMN end_date DROP NOT NULL;
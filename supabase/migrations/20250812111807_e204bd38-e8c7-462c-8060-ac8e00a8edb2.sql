-- Purge all applications and property listings
BEGIN;

-- Delete all applications
DELETE FROM public.applications;

-- Delete all properties
DELETE FROM public.properties;

COMMIT;
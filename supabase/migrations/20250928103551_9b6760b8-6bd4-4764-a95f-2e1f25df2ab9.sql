-- Remove expiration logic from application invites
ALTER TABLE public.application_invites 
DROP COLUMN IF EXISTS expires_at;

-- Remove any expiration checks that might exist
-- Note: This will make all invites permanent until manually updated
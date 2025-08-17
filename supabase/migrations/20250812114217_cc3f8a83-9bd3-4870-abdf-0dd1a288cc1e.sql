-- Purge all application invitations
BEGIN;
DELETE FROM public.application_invites;
COMMIT;
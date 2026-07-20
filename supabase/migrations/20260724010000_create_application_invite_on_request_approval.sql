-- Create an application_invite when a landlord approves an application_request.
--
-- Before this, approving a request created no invite, so:
--   * the tenant's Applications section had nothing to "start", and
--   * the messages "start application" path fell through to a tenant-side
--     INSERT into application_invites, which RLS forbids (only the landlord may
--     create invites) -> "new row violates row-level security policy for table
--     application_invites".
--
-- This SECURITY DEFINER trigger creates the invite with the correct landlord_id
-- on approval, so the tenant can start the application from the Applications
-- section (and the messages path finds the existing invite instead of trying
-- to create one).
CREATE OR REPLACE FUNCTION public.create_invite_on_request_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.application_invites ai
      WHERE ai.tenant_id = NEW.tenant_id
        AND ai.property_id = NEW.property_id
        AND ai.status = 'invited'
    ) THEN
      INSERT INTO public.application_invites (token, property_id, landlord_id, tenant_id, status)
      VALUES (gen_random_uuid()::text, NEW.property_id, NEW.landlord_id, NEW.tenant_id, 'invited');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_create_invite_on_request_approval ON public.application_requests;
CREATE TRIGGER trigger_create_invite_on_request_approval
  AFTER UPDATE ON public.application_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_invite_on_request_approval();

-- Backfill: approvals that happened before this trigger existed never got an
-- invite, leaving those tenants unable to start. Create the missing invites.
INSERT INTO public.application_invites (token, property_id, landlord_id, tenant_id, status)
SELECT gen_random_uuid()::text, ar.property_id, ar.landlord_id, ar.tenant_id, 'invited'
FROM public.application_requests ar
WHERE ar.status = 'approved'
  AND NOT EXISTS (
    SELECT 1 FROM public.application_invites ai
    WHERE ai.tenant_id = ar.tenant_id AND ai.property_id = ar.property_id AND ai.status = 'invited'
  );

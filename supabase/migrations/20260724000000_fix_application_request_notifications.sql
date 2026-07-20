-- Fix application-request notifications.
--
-- The notifications table was reshaped (title/reference_id/reference_type/
-- priority/action_url -> message/link_url/type/metadata) but the
-- application-request status-change trigger was never updated, so it inserted
-- non-existent columns. Every status change (e.g. a landlord approving a
-- requested application) failed with:
--   column "title" of relation "notifications" does not exist
--
-- There was also no notification to the landlord when a tenant CREATED a
-- request (only a realtime subscription while the dashboard is open), so
-- landlords never got a persistent alert for new requests.

-- 1. Repair the status-change trigger — notify the tenant via the canonical
--    create_notification() helper (real columns).
CREATE OR REPLACE FUNCTION public.notify_application_request_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'Your application request has been ' || NEW.status || '.',
      '/tenant/applications',
      'application_request_' || NEW.status,
      jsonb_build_object('application_request_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Notify the landlord when a tenant creates a new application request.
CREATE OR REPLACE FUNCTION public.notify_application_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prop RECORD;
  tenant_name TEXT;
BEGIN
  SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
  SELECT COALESCE(p.display_name, 'A tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;

  PERFORM public.create_notification(
    NEW.landlord_id,
    tenant_name || ' has requested to apply for ' || COALESCE(prop.title, prop.location, 'your property') || '.',
    '/enhancedlandlorddashboard/applications',
    'application_request_created',
    jsonb_build_object('application_request_id', NEW.id, 'property_id', NEW.property_id)
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_application_request_created ON public.application_requests;
CREATE TRIGGER trigger_application_request_created
  AFTER INSERT ON public.application_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_request_created();

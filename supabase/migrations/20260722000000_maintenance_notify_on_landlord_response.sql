-- Maintenance notifications: only tell the tenant when the landlord actually
-- responds to the request (marks it Busy / Completed), with a clear message —
-- not on every status change.

CREATE OR REPLACE FUNCTION public.notify_on_maintenance_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prop RECORD;
  phrase text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('in_progress', 'completed') THEN
    SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
    phrase := CASE NEW.status
      WHEN 'in_progress' THEN 'is now being worked on'
      WHEN 'completed' THEN 'has been completed'
      ELSE 'was updated'
    END;
    PERFORM public.create_notification(
      NEW.tenant_id,
      'Maintenance update',
      'Your maintenance request "' || COALESCE(NEW.title, 'request') || '" ' || phrase || '.',
      '/enhancedtenantdashboard?tab=maintenance',
      'maintenance',
      jsonb_build_object('maintenance_request_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$function$;

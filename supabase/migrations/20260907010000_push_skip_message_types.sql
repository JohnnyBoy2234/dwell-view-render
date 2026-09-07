-- Chat messages already push via the dedicated send-message-push function
-- (triggered by messages_push_notify), which shows the sender/property and
-- skips when the recipient is actively in the app. The universal notification
-- push must therefore NOT also push for message-type notifications, or the
-- recipient gets two pushes for one message. The in-app notification row is
-- still created (so the bell shows it) — we just skip the duplicate push.
CREATE OR REPLACE FUNCTION public.notify_push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type IN ('message', 'new_message') THEN
    RETURN NEW;  -- chat push is handled by send-message-push
  END IF;

  PERFORM net.http_post(
    url := 'https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/send-notification-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig'
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$function$;

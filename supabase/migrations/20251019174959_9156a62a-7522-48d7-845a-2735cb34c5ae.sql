-- Fix the notify_on_kyc_status_change trigger to only use 'declined' instead of 'rejected'
CREATE OR REPLACE FUNCTION public.notify_on_kyc_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'ID verification approved — You now have access to the system.',
        '/enhancedtenantdashboard',
        'system',
        jsonb_build_object('kyc_status', NEW.status)
      );
    ELSIF NEW.status = 'declined' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'ID verification requires attention',
        '/verify-id',
        'system',
        jsonb_build_object('kyc_status', NEW.status, 'notes', NEW.notes)
      );
    ELSIF NEW.status = 'submitted' THEN
      -- Notify admins about new KYC submission
      INSERT INTO public.notifications (user_id, message, link_url, type, metadata)
      SELECT ur.user_id,
             'New ID verification submitted for review',
             '/admin/kyc',
             'system',
             jsonb_build_object('kyc_user_id', NEW.user_id)
      FROM public.user_roles ur
      WHERE ur.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
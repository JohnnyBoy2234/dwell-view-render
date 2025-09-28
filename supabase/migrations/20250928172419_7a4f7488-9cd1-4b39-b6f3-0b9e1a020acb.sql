-- Fix the notify_on_kyc_status_change function to use 'declined' instead of 'rejected'
CREATE OR REPLACE FUNCTION public.notify_on_kyc_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify user when KYC status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'ID verification approved',
        'Your identity verification has been approved. You can now request property viewings.',
        '/enhancedtenantdashboard',
        'system',
        jsonb_build_object('kyc_status', NEW.status)
      );
    ELSIF NEW.status = 'declined' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'ID verification requires attention',
        'Your identity verification needs to be resubmitted. Please check the requirements and try again.',
        '/verify-id',
        'system',
        jsonb_build_object('kyc_status', NEW.status, 'notes', NEW.notes)
      );
    ELSIF NEW.status = 'submitted' THEN
      -- Notify all admins about new KYC submission
      INSERT INTO public.notifications (user_id, message, link_url, type, metadata)
      SELECT ur.user_id, 
             'New ID verification submitted for review',
             '/admin/kyc-management',
             'system',
             jsonb_build_object('kyc_user_id', NEW.user_id)
      FROM public.user_roles ur 
      WHERE ur.role = 'admin';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
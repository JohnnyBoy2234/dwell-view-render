-- Create comprehensive notification triggers for all event types

-- Add notification_read_status table to track read state
CREATE TABLE IF NOT EXISTS public.notification_read_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  notification_key text NOT NULL, -- unique key for each notification type/record
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_key)
);

-- Enable RLS
ALTER TABLE public.notification_read_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_read_status
CREATE POLICY "Users can manage their notification read status" 
ON public.notification_read_status 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for maintenance request notifications
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_request()
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
  SELECT COALESCE(p.display_name, 'Tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;

  -- Notify landlord about new maintenance request
  PERFORM public.create_notification(
    NEW.landlord_id,
    'New maintenance request from ' || tenant_name || ' for ' || COALESCE(prop.title, prop.location, 'a property') || '.',
    '/enhancedlandlorddashboard?tab=maintenance',
    'maintenance',
    jsonb_build_object('maintenance_request_id', NEW.id, 'property_id', NEW.property_id)
  );

  RETURN NEW;
END;
$function$;

-- Trigger for maintenance status updates
CREATE OR REPLACE FUNCTION public.notify_on_maintenance_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  prop RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
    
    -- Notify tenant about status update
    PERFORM public.create_notification(
      NEW.tenant_id,
      'Maintenance request updated: ' || NEW.status,
      'Your maintenance request for ' || COALESCE(prop.title, prop.location, 'a property') || ' has been updated to ' || NEW.status || '.',
      '/enhancedtenantdashboard?tab=maintenance',
      'maintenance',
      jsonb_build_object('maintenance_request_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for payment notifications
CREATE OR REPLACE FUNCTION public.notify_on_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tenant_name TEXT;
  property_info RECORD;
BEGIN
  SELECT COALESCE(p.display_name, 'Tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;
  
  -- Get property info from tenancy
  SELECT pr.title, pr.location INTO property_info 
  FROM public.properties pr 
  JOIN public.tenancies t ON t.property_id = pr.id 
  WHERE t.id = NEW.tenancy_id;

  -- Notify landlord when payment is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.create_notification(
      NEW.landlord_id,
      'Payment received from ' || tenant_name,
      'Payment of R' || NEW.amount || ' received for ' || COALESCE(property_info.title, property_info.location, 'property') || '.',
      '/enhancedlandlorddashboard?tab=payments',
      'payment',
      jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger for KYC status notifications
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
    ELSIF NEW.status = 'rejected' THEN
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
$function$;

-- Trigger for inventory notifications
CREATE OR REPLACE FUNCTION public.notify_on_inventory_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  property_info RECORD;
  tenant_name TEXT;
BEGIN
  SELECT pr.title, pr.location INTO property_info FROM public.properties pr WHERE pr.id = NEW.property_id;
  SELECT COALESCE(p.display_name, 'Tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;

  -- Notify landlord when inventory is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.create_notification(
      NEW.landlord_id,
      'Property inventory completed',
      tenant_name || ' has completed the inventory for ' || COALESCE(property_info.title, property_info.location, 'a property') || '.',
      '/enhancedlandlorddashboard?tab=inventory',
      'system',
      jsonb_build_object('inventory_id', NEW.id, 'property_id', NEW.property_id)
    );
  END IF;

  -- Notify tenant when landlord approves
  IF NEW.landlord_approved = true AND (OLD.landlord_approved IS NULL OR OLD.landlord_approved = false) THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'Inventory approved',
      'Your property inventory has been approved by the landlord.',
      '/enhancedtenantdashboard?tab=inventory',
      'system',
      jsonb_build_object('inventory_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger for offer notifications
CREATE OR REPLACE FUNCTION public.notify_on_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  property_info RECORD;
  tenant_name TEXT;
  landlord_name TEXT;
BEGIN
  SELECT pr.title, pr.location INTO property_info FROM public.properties pr WHERE pr.id = NEW.listing_id;
  SELECT COALESCE(p.display_name, 'Tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;
  SELECT COALESCE(p.display_name, 'Landlord') INTO landlord_name FROM public.profiles p WHERE p.user_id = NEW.landlord_id;

  -- Notify tenant when offer is sent
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'New rental offer received',
      landlord_name || ' has sent you an offer for ' || COALESCE(property_info.title, property_info.location, 'a property') || '.',
      '/enhancedtenantdashboard?tab=offers',
      'application',
      jsonb_build_object('offer_id', NEW.id, 'property_id', NEW.listing_id)
    );
  END IF;

  -- Notify landlord when offer is accepted/declined
  IF NEW.status IN ('accepted', 'declined') AND OLD.status != NEW.status THEN
    PERFORM public.create_notification(
      NEW.landlord_id,
      'Offer ' || NEW.status,
      tenant_name || ' has ' || NEW.status || ' your offer for ' || COALESCE(property_info.title, property_info.location, 'a property') || '.',
      '/enhancedlandlorddashboard?tab=offers',
      'application',
      jsonb_build_object('offer_id', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Create triggers
DROP TRIGGER IF EXISTS notify_maintenance_request ON public.maintenance_requests;
CREATE TRIGGER notify_maintenance_request
  AFTER INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_maintenance_request();

DROP TRIGGER IF EXISTS notify_maintenance_status ON public.maintenance_requests;
CREATE TRIGGER notify_maintenance_status
  AFTER UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_maintenance_status_update();

DROP TRIGGER IF EXISTS notify_payment_update ON public.payments;
CREATE TRIGGER notify_payment_update
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_payment_update();

DROP TRIGGER IF EXISTS notify_kyc_status ON public.kyc_profiles;
CREATE TRIGGER notify_kyc_status
  AFTER UPDATE ON public.kyc_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_kyc_status_change();

DROP TRIGGER IF EXISTS notify_inventory_status ON public.inventory_records;
CREATE TRIGGER notify_inventory_status
  AFTER UPDATE ON public.inventory_records
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_inventory_status_change();

DROP TRIGGER IF EXISTS notify_offer_update ON public.offers;
CREATE TRIGGER notify_offer_update
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_offer_update();
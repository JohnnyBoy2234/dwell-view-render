-- Update notification link URLs to match app routes
CREATE OR REPLACE FUNCTION public.notify_on_application_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  landlord_name TEXT;
BEGIN
  SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
  SELECT COALESCE(p.display_name, 'Landlord') INTO landlord_name FROM public.profiles p WHERE p.user_id = NEW.landlord_id;

  PERFORM public.create_notification(
    NEW.tenant_id,
    landlord_name || ' has invited you to apply for ' || COALESCE(prop.title, prop.location, 'a property') || '.',
    '/apply/invite/' || NEW.token,
    'application_invite',
    jsonb_build_object('property_id', NEW.property_id, 'invite_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_tenancy_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  tenant_name TEXT;
BEGIN
  SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
  SELECT COALESCE(p.display_name, 'Tenant') INTO tenant_name FROM public.profiles p WHERE p.user_id = NEW.tenant_id;

  -- Lease sent to tenant for signature
  IF NEW.lease_status = 'awaiting_tenant_signature' AND (OLD.lease_status IS DISTINCT FROM NEW.lease_status) THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'Your lease for ' || COALESCE(prop.title, prop.location, 'a property') || ' is ready to sign.',
      '/lease-signing/' || NEW.id,
      'lease_sent',
      jsonb_build_object('tenancy_id', NEW.id)
    );
  END IF;

  -- Tenant signed -> notify landlord
  IF (NEW.tenant_signed_at IS NOT NULL AND (OLD.tenant_signed_at IS NULL)) OR (NEW.lease_status = 'awaiting_landlord_signature' AND (OLD.lease_status IS DISTINCT FROM NEW.lease_status)) THEN
    PERFORM public.create_notification(
      NEW.landlord_id,
      tenant_name || ' has signed the lease for ' || COALESCE(prop.title, prop.location, 'a property') || '. It is now ready for your final signature.',
      '/landlord-lease-signing/' || NEW.id,
      'lease_signed_by_tenant',
      jsonb_build_object('tenancy_id', NEW.id)
    );
  END IF;

  -- Lease finalized/completed -> both
  IF NEW.lease_status = 'completed' AND (OLD.lease_status IS DISTINCT FROM NEW.lease_status) THEN
    PERFORM public.create_notification(
      NEW.tenant_id,
      'The lease for ' || COALESCE(prop.title, prop.location, 'a property') || ' is now active.',
      '/tenant-dashboard?tab=leases',
      'lease_finalized',
      jsonb_build_object('tenancy_id', NEW.id)
    );
    PERFORM public.create_notification(
      NEW.landlord_id,
      'The lease for ' || COALESCE(prop.title, prop.location, 'a property') || ' is now active.',
      '/dashboard?tab=leases',
      'lease_finalized',
      jsonb_build_object('tenancy_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;
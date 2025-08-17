-- Create notifications table and automation triggers
-- 1) Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies: users can view and update their own notifications. Inserts will be done via SECURITY DEFINER functions/triggers.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their notifications'
  ) THEN
    CREATE POLICY "Users can view their notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their notifications'
  ) THEN
    CREATE POLICY "Users can update their notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Helper function to create notifications with elevated privileges
CREATE OR REPLACE FUNCTION public.create_notification(_user_id uuid, _message text, _link_url text, _type text DEFAULT NULL, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, message, link_url, type, metadata)
  VALUES (_user_id, _message, _link_url, _type, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

-- Make sure only privileged roles can execute directly if needed; everyone can call but RLS protected insert is bypassed via definer.
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) TO authenticated, anon;

-- 2) Triggers for events

-- New Message -> notify the non-sender participant
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv RECORD;
  sender_name TEXT;
  property_address TEXT;
  recipient_id UUID;
  link TEXT;
BEGIN
  SELECT c.*, p.location AS property_location, pr.title AS property_title
  INTO conv
  FROM public.conversations c
  LEFT JOIN public.properties pr ON pr.id = c.property_id
  LEFT JOIN public.properties p ON p.id = c.property_id -- keep alias compatibility
  WHERE c.id = NEW.conversation_id;

  IF conv.landlord_id = NEW.sender_id THEN
    recipient_id := conv.tenant_id;
  ELSE
    recipient_id := conv.landlord_id;
  END IF;

  SELECT COALESCE(profiles.display_name, 'User') INTO sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  property_address := COALESCE(conv.property_title, conv.property_location, 'a property');
  link := '/messages';

  PERFORM public.create_notification(
    recipient_id,
    'You have a new message from ' || sender_name || ' regarding ' || property_address || '.',
    link,
    'new_message',
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- Viewing booked/completed notifications on viewing_slots
CREATE OR REPLACE FUNCTION public.notify_on_viewing_slot_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop RECORD;
  start_ts TIMESTAMPTZ;
  date_txt TEXT;
  time_txt TEXT;
BEGIN
  IF NEW.property_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT pr.title, pr.location, pr.landlord_id INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;
  start_ts := NEW.start_time;
  date_txt := to_char(start_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  time_txt := to_char(start_ts AT TIME ZONE 'UTC', 'HH24:MI');

  IF NEW.status = 'booked' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.booked_by_tenant_id IS NOT NULL THEN
    -- Notify tenant
    PERFORM public.create_notification(
      NEW.booked_by_tenant_id,
      'Your viewing for ' || COALESCE(prop.title, prop.location, 'a property') || ' is confirmed for ' || date_txt || ' at ' || time_txt || '.',
      '/tenant-dashboard?tab=viewings',
      'viewing_booked',
      jsonb_build_object('property_id', NEW.property_id, 'slot_id', NEW.id)
    );
  END IF;

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Notify tenant
    IF NEW.booked_by_tenant_id IS NOT NULL THEN
      PERFORM public.create_notification(
        NEW.booked_by_tenant_id,
        'The viewing for ' || COALESCE(prop.title, prop.location, 'a property') || ' has been marked as complete.',
        '/tenant-dashboard?tab=viewings',
        'viewing_completed',
        jsonb_build_object('property_id', NEW.property_id, 'slot_id', NEW.id)
      );
    END IF;
    -- Notify landlord
    IF prop.landlord_id IS NOT NULL THEN
      PERFORM public.create_notification(
        prop.landlord_id,
        'The viewing for ' || COALESCE(prop.title, prop.location, 'a property') || ' has been marked as complete.',
        '/dashboard?tab=viewings',
        'viewing_completed',
        jsonb_build_object('property_id', NEW.property_id, 'slot_id', NEW.id)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_viewing_slot_update ON public.viewing_slots;
CREATE TRIGGER trg_notify_on_viewing_slot_update
AFTER UPDATE ON public.viewing_slots
FOR EACH ROW EXECUTE FUNCTION public.notify_on_viewing_slot_update();

-- Application invite sent -> tenant
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
    '/apply-invite?token=' || NEW.token,
    'application_invite',
    jsonb_build_object('property_id', NEW.property_id, 'invite_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_application_invite ON public.application_invites;
CREATE TRIGGER trg_notify_on_application_invite
AFTER INSERT ON public.application_invites
FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_invite();

-- Application submitted -> landlord
CREATE OR REPLACE FUNCTION public.notify_on_application_submitted()
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

  PERFORM public.create_notification(
    NEW.landlord_id,
    'You have a new application from ' || tenant_name || ' for ' || COALESCE(prop.title, prop.location, 'a property') || '.',
    '/dashboard?tab=applications',
    'application_submitted',
    jsonb_build_object('application_id', NEW.id, 'property_id', NEW.property_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_application_submitted ON public.applications;
CREATE TRIGGER trg_notify_on_application_submitted
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_submitted();

-- Lease status changes
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
      '/landlord/lease-signing/' || NEW.id,
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

DROP TRIGGER IF EXISTS trg_notify_on_tenancy_update ON public.tenancies;
CREATE TRIGGER trg_notify_on_tenancy_update
AFTER UPDATE ON public.tenancies
FOR EACH ROW EXECUTE FUNCTION public.notify_on_tenancy_update();
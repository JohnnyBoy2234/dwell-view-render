-- Rental application v3: six-step flow support.
--  * Richer application status model (more-info loop, withdrawal, expiry)
--  * Server-side transition + immutability guard on applications
--  * Request-more-information records
--  * Private landlord notes
--  * Application audit trail (application_events)
-- Historical rows keep their existing status values; nothing is migrated
-- destructively.

-- 1. Status model ------------------------------------------------------------
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'invited', 'submitted', 'pending_credit_check', 'pending',
    'more_info_requested', 'accepted', 'declined', 'withdrawn', 'expired'
  ));

-- Tenants need UPDATE to withdraw / mark a more-info response; the guard
-- trigger below limits them to exactly those transitions.
DROP POLICY IF EXISTS "Tenants can update their own applications" ON public.applications;
CREATE POLICY "Tenants can update their own applications"
ON public.applications
FOR UPDATE
USING (auth.uid() = tenant_id);

-- 2. Transition + immutability guard -----------------------------------------
-- RLS cannot restrict which columns a landlord updates; this trigger makes the
-- submitted answers immutable and validates every status transition server-side.
CREATE OR REPLACE FUNCTION public.guard_application_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor uuid := auth.uid();
  active_statuses text[] := ARRAY['submitted', 'pending_credit_check', 'pending', 'more_info_requested'];
BEGIN
  -- Service-role / direct-postgres maintenance bypasses the guard
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id    IS DISTINCT FROM OLD.tenant_id
  OR NEW.landlord_id  IS DISTINCT FROM OLD.landlord_id
  OR NEW.property_id  IS DISTINCT FROM OLD.property_id
  OR NEW.snapshot     IS DISTINCT FROM OLD.snapshot
  OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
  OR NEW.version      IS DISTINCT FROM OLD.version
  OR NEW.created_at   IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Submitted application details cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF actor = OLD.landlord_id
       AND OLD.status = ANY (active_statuses)
       AND NEW.status IN ('accepted', 'declined', 'more_info_requested') THEN
      RETURN NEW;
    END IF;
    IF actor = OLD.tenant_id
       AND OLD.status = ANY (active_statuses)
       AND NEW.status = 'withdrawn' THEN
      RETURN NEW;
    END IF;
    -- Tenant responded to a more-info request: back under review
    IF actor = OLD.tenant_id
       AND OLD.status = 'more_info_requested'
       AND NEW.status = 'pending' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Status change from % to % is not allowed', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_application_update ON public.applications;
CREATE TRIGGER trg_guard_application_update
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_update();

-- 3. Request more information --------------------------------------------------
CREATE TABLE public.application_info_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  item TEXT NOT NULL,
  message TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'responded')),
  response TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_info_requests_application
  ON public.application_info_requests(application_id);

ALTER TABLE public.application_info_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage info requests for their applications"
ON public.application_info_requests
FOR ALL
USING (auth.uid() = landlord_id)
WITH CHECK (
  auth.uid() = landlord_id
  AND application_id IN (SELECT id FROM public.applications WHERE landlord_id = auth.uid())
);

CREATE POLICY "Tenants view their info requests"
ON public.application_info_requests
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants respond to their info requests"
ON public.application_info_requests
FOR UPDATE
USING (auth.uid() = tenant_id);

-- Tenants may only fill in the response fields — the request itself stays as
-- the landlord wrote it (audit history, no silent overwriting).
CREATE OR REPLACE FUNCTION public.guard_info_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() = OLD.tenant_id AND auth.uid() IS DISTINCT FROM OLD.landlord_id THEN
    IF NEW.item IS DISTINCT FROM OLD.item
    OR NEW.message IS DISTINCT FROM OLD.message
    OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.application_id IS DISTINCT FROM OLD.application_id
    OR NEW.landlord_id IS DISTINCT FROM OLD.landlord_id
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'Only the response fields can be updated';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_info_request_update
BEFORE UPDATE ON public.application_info_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_info_request_update();

-- 4. Private landlord notes ----------------------------------------------------
-- Kept in their own table so the tenant's SELECT policy on applications can
-- never expose them.
CREATE TABLE public.application_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_notes_application
  ON public.application_notes(application_id);

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage their private application notes"
ON public.application_notes
FOR ALL
USING (auth.uid() = landlord_id)
WITH CHECK (
  auth.uid() = landlord_id
  AND application_id IN (SELECT id FROM public.applications WHERE landlord_id = auth.uid())
);

-- 5. Audit trail ----------------------------------------------------------------
-- Rows are written only by the SECURITY DEFINER triggers below; there is no
-- client INSERT policy on purpose.
CREATE TABLE public.application_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id UUID,
  event_type TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_application_events_application
  ON public.application_events(application_id);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Application participants view the audit trail"
ON public.application_events
FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.applications
    WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.log_application_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'invited' THEN
    INSERT INTO public.application_events (application_id, actor_id, event_type)
    VALUES (NEW.id, NEW.tenant_id, 'submitted');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_application_submitted
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_submitted();

CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prop RECORD;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_events (application_id, actor_id, event_type, detail)
    VALUES (NEW.id, auth.uid(), 'status_changed',
            jsonb_build_object('from', OLD.status, 'to', NEW.status));

    SELECT pr.title, pr.location INTO prop FROM public.properties pr WHERE pr.id = NEW.property_id;

    IF NEW.status IN ('accepted', 'declined') THEN
      PERFORM public.create_notification(
        NEW.tenant_id,
        CASE WHEN NEW.status = 'accepted'
          THEN 'The landlord has approved your rental application for ' || COALESCE(prop.title, 'the property') || '.'
          ELSE 'The landlord has decided not to proceed with your rental application for ' || COALESCE(prop.title, 'the property') || '.'
        END,
        '/application/' || NEW.id,
        'application_decision',
        jsonb_build_object('application_id', NEW.id, 'status', NEW.status)
      );
    ELSIF NEW.status = 'withdrawn' THEN
      PERFORM public.create_notification(
        NEW.landlord_id,
        'An applicant withdrew their rental application for ' || COALESCE(prop.title, 'your property') || '.',
        '/enhancedlandlorddashboard/applications',
        'application_withdrawn',
        jsonb_build_object('application_id', NEW.id)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_application_status_change
AFTER UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.log_application_status_change();

CREATE OR REPLACE FUNCTION public.log_info_request_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_events (application_id, actor_id, event_type, detail)
    VALUES (NEW.application_id, NEW.landlord_id, 'info_requested',
            jsonb_build_object('item', NEW.item));
    PERFORM public.create_notification(
      NEW.tenant_id,
      'The landlord has asked for more information on your rental application: ' || NEW.item,
      '/application/' || NEW.application_id,
      'application_info_requested',
      jsonb_build_object('application_id', NEW.application_id, 'request_id', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'responded' AND OLD.status = 'open' THEN
    INSERT INTO public.application_events (application_id, actor_id, event_type, detail)
    VALUES (NEW.application_id, NEW.tenant_id, 'info_response',
            jsonb_build_object('item', NEW.item));
    PERFORM public.create_notification(
      NEW.landlord_id,
      'An applicant responded to your information request.',
      '/application/' || NEW.application_id,
      'application_info_response',
      jsonb_build_object('application_id', NEW.application_id, 'request_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_info_request_activity
AFTER INSERT OR UPDATE ON public.application_info_requests
FOR EACH ROW EXECUTE FUNCTION public.log_info_request_activity();

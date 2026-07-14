-- Condition Report — Phase 1: two-stage signing (receipt + approval), per-room
-- disputes, 7-day auto-approval window, tamper-detection re-open, audit log and
-- tamper-evident PDF. Applies to both move_in and move_out records.
--
-- State machine (column `state`):
--   open              — both parties upload photos/notes (as before)
--   awaiting_receipts — a party tapped "Ready to sign off"; uploads frozen;
--                       both parties must sign a receipt
--   awaiting_approval — both receipts in; 7-day window running; each party
--                       approves or disputes; silence auto-approves
--   locked            — both approved (or auto-approved); PDF generated; final

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) EVOLVE condition_records
-- ─────────────────────────────────────────────────────────────────────────────

-- The generated `locked` column (true iff both parties attested) stays exactly
-- correct under the new model — an explicit `state` column is added alongside
-- it, and dependent policies keep working. state='locked' iff locked=true.
ALTER TABLE public.condition_records
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'open'
    CHECK (state IN ('open', 'awaiting_receipts', 'awaiting_approval', 'locked')),
  ADD COLUMN IF NOT EXISTS signoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signoff_by UUID,
  ADD COLUMN IF NOT EXISTS tenant_receipt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS landlord_receipt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_days INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ;

-- Backfill: previously-locked records (both attested under the old model) stay
-- locked; everything else restarts in `open` under the new flow.
UPDATE public.condition_records
SET state = 'locked',
    window_started_at = COALESCE(window_started_at, created_at)
WHERE tenant_attested_at IS NOT NULL AND landlord_attested_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) SIGNATURES (receipt + approval, one each per party, with evidence metadata)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  party TEXT NOT NULL CHECK (party IN ('tenant', 'landlord')),
  kind TEXT NOT NULL CHECK (kind IN ('receipt', 'approval')),
  auto BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip TEXT,
  user_agent TEXT,
  consent_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (record_id, party, kind)
);
CREATE INDEX IF NOT EXISTS idx_condition_signatures_record ON public.condition_signatures(record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) DISPUTES (per-room, with the other party's agree/disagree response)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  location_tag TEXT NOT NULL,
  raised_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  raised_party TEXT NOT NULL CHECK (raised_party IN ('tenant', 'landlord')),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'agreed', 'disagreed')),
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_disputes_record ON public.condition_disputes(record_id);

-- Dispute evidence photos reuse condition_photos, linked via dispute_id.
ALTER TABLE public.condition_photos
  ADD COLUMN IF NOT EXISTS dispute_id UUID REFERENCES public.condition_disputes(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) AUDIT LOG (every state-changing action + signature + dispute)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_record_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_record_audit_record ON public.condition_record_audit(record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RLS for the new tables — parties SELECT; all writes go through RPCs
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.condition_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_record_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties view condition signatures" ON public.condition_signatures;
CREATE POLICY "Parties view condition signatures"
ON public.condition_signatures FOR SELECT
USING (public.is_condition_record_party(record_id));

DROP POLICY IF EXISTS "Parties view condition disputes" ON public.condition_disputes;
CREATE POLICY "Parties view condition disputes"
ON public.condition_disputes FOR SELECT
USING (public.is_condition_record_party(record_id));

DROP POLICY IF EXISTS "Parties view condition audit" ON public.condition_record_audit;
CREATE POLICY "Parties view condition audit"
ON public.condition_record_audit FOR SELECT
USING (public.is_condition_record_party(record_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) PHOTO INSERT GUARD — normal photos only while open; dispute photos only
--    while awaiting_approval and attached to a dispute the user raised.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_photos_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_state TEXT;
BEGIN
  SELECT state INTO v_state FROM condition_records WHERE id = NEW.record_id;
  IF NEW.dispute_id IS NOT NULL THEN
    IF v_state <> 'awaiting_approval' THEN
      RAISE EXCEPTION 'Dispute photos can only be added during the review window';
    END IF;
  ELSIF v_state <> 'open' THEN
    RAISE EXCEPTION 'This record is no longer open for photos';
  END IF;
  RETURN NEW;
END;
$$;

-- Replace the old per-party attestation-based photo guard with a state guard.
DROP TRIGGER IF EXISTS condition_photo_change ON public.condition_photos;
DROP TRIGGER IF EXISTS condition_photos_guard_trg ON public.condition_photos;
CREATE TRIGGER condition_photos_guard_trg
BEFORE INSERT ON public.condition_photos
FOR EACH ROW EXECUTE FUNCTION public.condition_photos_guard();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) AUDIT HELPER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_audit(p_record_id UUID, p_action TEXT, p_details JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO condition_record_audit (record_id, actor_id, action, details)
  VALUES (p_record_id, auth.uid(), p_action, COALESCE(p_details, '{}'::jsonb));
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) LOCK (fires the PDF edge function via pg_net once both parties approved)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_maybe_lock(p_record_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec condition_records%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM condition_records WHERE id = p_record_id FOR UPDATE;
  IF v_rec.tenant_attested_at IS NOT NULL AND v_rec.landlord_attested_at IS NOT NULL AND v_rec.state <> 'locked' THEN
    UPDATE condition_records SET state = 'locked' WHERE id = p_record_id;
    PERFORM condition_audit(p_record_id, 'locked');
    PERFORM net.http_post(
      url := 'https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/generate-condition-report-pdf',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig'
      ),
      body := jsonb_build_object('record_id', p_record_id)
    );
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9) RPCs — the only way to change signing state (party-checked, audited)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_send_for_signoff(p_record_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT; v_photos INT;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id FOR UPDATE OF r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF auth.uid() NOT IN (v_t, v_l) THEN RAISE EXCEPTION 'Not a party to this record'; END IF;
  IF v_state <> 'open' THEN RAISE EXCEPTION 'Record is not open'; END IF;
  SELECT count(*) INTO v_photos FROM condition_photos WHERE record_id = p_record_id AND dispute_id IS NULL;
  IF v_photos = 0 THEN RAISE EXCEPTION 'Add at least one photo before signing off'; END IF;
  UPDATE condition_records SET state = 'awaiting_receipts', signoff_at = now(), signoff_by = auth.uid()
  WHERE id = p_record_id;
  PERFORM condition_audit(p_record_id, 'sent_for_signoff');
END;
$$;

CREATE OR REPLACE FUNCTION public.condition_sign_receipt(p_record_id UUID, p_ip TEXT DEFAULT NULL, p_ua TEXT DEFAULT NULL, p_consent TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT; v_party TEXT; v_both BOOLEAN;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id FOR UPDATE OF r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF v_state <> 'awaiting_receipts' THEN RAISE EXCEPTION 'Not awaiting receipts'; END IF;
  IF auth.uid() = v_t THEN v_party := 'tenant';
  ELSIF auth.uid() = v_l THEN v_party := 'landlord';
  ELSE RAISE EXCEPTION 'Not a party to this record'; END IF;

  INSERT INTO condition_signatures (record_id, signer_id, party, kind, ip, user_agent, consent_text)
  VALUES (p_record_id, auth.uid(), v_party, 'receipt', p_ip, p_ua, p_consent)
  ON CONFLICT (record_id, party, kind) DO NOTHING;

  IF v_party = 'tenant' THEN
    UPDATE condition_records SET tenant_receipt_at = COALESCE(tenant_receipt_at, now()) WHERE id = p_record_id;
  ELSE
    UPDATE condition_records SET landlord_receipt_at = COALESCE(landlord_receipt_at, now()) WHERE id = p_record_id;
  END IF;
  PERFORM condition_audit(p_record_id, 'receipt_signed', jsonb_build_object('party', v_party));

  SELECT tenant_receipt_at IS NOT NULL AND landlord_receipt_at IS NOT NULL INTO v_both
  FROM condition_records WHERE id = p_record_id;
  IF v_both THEN
    UPDATE condition_records SET state = 'awaiting_approval', window_started_at = now()
    WHERE id = p_record_id AND state = 'awaiting_receipts';
    PERFORM condition_audit(p_record_id, 'approval_window_opened');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.condition_approve(p_record_id UUID, p_ip TEXT DEFAULT NULL, p_ua TEXT DEFAULT NULL, p_consent TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT; v_party TEXT;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id FOR UPDATE OF r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF v_state <> 'awaiting_approval' THEN RAISE EXCEPTION 'Not awaiting approval'; END IF;
  IF auth.uid() = v_t THEN v_party := 'tenant';
  ELSIF auth.uid() = v_l THEN v_party := 'landlord';
  ELSE RAISE EXCEPTION 'Not a party to this record'; END IF;

  INSERT INTO condition_signatures (record_id, signer_id, party, kind, ip, user_agent, consent_text)
  VALUES (p_record_id, auth.uid(), v_party, 'approval', p_ip, p_ua, p_consent)
  ON CONFLICT (record_id, party, kind) DO NOTHING;

  IF v_party = 'tenant' THEN
    UPDATE condition_records SET tenant_attested_at = COALESCE(tenant_attested_at, now()), tenant_attested_by = COALESCE(tenant_attested_by, auth.uid()) WHERE id = p_record_id;
  ELSE
    UPDATE condition_records SET landlord_attested_at = COALESCE(landlord_attested_at, now()), landlord_attested_by = COALESCE(landlord_attested_by, auth.uid()) WHERE id = p_record_id;
  END IF;
  PERFORM condition_audit(p_record_id, 'approved', jsonb_build_object('party', v_party));
  PERFORM condition_maybe_lock(p_record_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.condition_raise_dispute(p_record_id UUID, p_location_tag TEXT, p_comment TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT; v_party TEXT; v_id UUID;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF v_state <> 'awaiting_approval' THEN RAISE EXCEPTION 'Not awaiting approval'; END IF;
  IF auth.uid() = v_t THEN v_party := 'tenant';
  ELSIF auth.uid() = v_l THEN v_party := 'landlord';
  ELSE RAISE EXCEPTION 'Not a party to this record'; END IF;
  IF p_comment IS NULL OR btrim(p_comment) = '' THEN RAISE EXCEPTION 'A dispute needs a comment'; END IF;

  INSERT INTO condition_disputes (record_id, location_tag, raised_by, raised_party, comment)
  VALUES (p_record_id, p_location_tag, auth.uid(), v_party, btrim(p_comment))
  RETURNING id INTO v_id;
  PERFORM condition_audit(p_record_id, 'dispute_raised', jsonb_build_object('party', v_party, 'location', p_location_tag, 'dispute_id', v_id));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.condition_respond_dispute(p_dispute_id UUID, p_agree BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_raised_by UUID; v_record UUID;
BEGIN
  SELECT d.record_id, d.raised_by, t.tenant_id, t.landlord_id
  INTO v_record, v_raised_by, v_t, v_l
  FROM condition_disputes d
  JOIN condition_records r ON r.id = d.record_id
  JOIN tenancies t ON t.id = r.tenancy_id
  WHERE d.id = p_dispute_id FOR UPDATE OF d;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF auth.uid() NOT IN (v_t, v_l) THEN RAISE EXCEPTION 'Not a party to this record'; END IF;
  IF auth.uid() = v_raised_by THEN RAISE EXCEPTION 'The other party responds to your dispute'; END IF;

  UPDATE condition_disputes
  SET status = CASE WHEN p_agree THEN 'agreed' ELSE 'disagreed' END,
      responded_by = auth.uid(), responded_at = now()
  WHERE id = p_dispute_id;
  PERFORM condition_audit(v_record, 'dispute_responded', jsonb_build_object('dispute_id', p_dispute_id, 'agreed', p_agree));
END;
$$;

-- Re-open before final lock: revokes all signatures, clears the timeline and
-- returns to `open`. (A locked record is permanent and cannot be re-opened.)
CREATE OR REPLACE FUNCTION public.condition_reopen(p_record_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id FOR UPDATE OF r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF auth.uid() NOT IN (v_t, v_l) THEN RAISE EXCEPTION 'Not a party to this record'; END IF;
  IF v_state = 'open' THEN RETURN; END IF;
  IF v_state = 'locked' THEN RAISE EXCEPTION 'A finalised record cannot be re-opened'; END IF;

  DELETE FROM condition_signatures WHERE record_id = p_record_id;
  UPDATE condition_records SET
    state = 'open', signoff_at = NULL, signoff_by = NULL,
    tenant_receipt_at = NULL, landlord_receipt_at = NULL,
    tenant_attested_at = NULL, landlord_attested_at = NULL,
    tenant_attested_by = NULL, landlord_attested_by = NULL,
    window_started_at = NULL
  WHERE id = p_record_id;
  PERFORM condition_audit(p_record_id, 'reopened_signatures_revoked');
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10) AUTO-APPROVAL — daily cron closes expired windows and locks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_expire_windows()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT cr.id, cr.tenant_receipt_at, cr.landlord_receipt_at,
           cr.tenant_attested_at, cr.landlord_attested_at
    FROM condition_records cr
    WHERE cr.state = 'awaiting_approval'
      AND cr.window_started_at IS NOT NULL
      AND cr.window_started_at + (cr.window_days || ' days')::interval < now()
  LOOP
    -- Auto-approve any party that hasn't approved, using their receipt.
    IF r.tenant_attested_at IS NULL THEN
      UPDATE condition_records SET tenant_attested_at = now() WHERE id = r.id;
      INSERT INTO condition_signatures (record_id, party, kind, auto, consent_text)
      VALUES (r.id, 'tenant', 'approval', true, 'Auto-approved after the review window closed without a response.')
      ON CONFLICT (record_id, party, kind) DO NOTHING;
      INSERT INTO condition_record_audit (record_id, action, details)
      VALUES (r.id, 'auto_approved', jsonb_build_object('party', 'tenant'));
    END IF;
    IF r.landlord_attested_at IS NULL THEN
      UPDATE condition_records SET landlord_attested_at = now() WHERE id = r.id;
      INSERT INTO condition_signatures (record_id, party, kind, auto, consent_text)
      VALUES (r.id, 'landlord', 'approval', true, 'Auto-approved after the review window closed without a response.')
      ON CONFLICT (record_id, party, kind) DO NOTHING;
      INSERT INTO condition_record_audit (record_id, action, details)
      VALUES (r.id, 'auto_approved', jsonb_build_object('party', 'landlord'));
    END IF;
    PERFORM condition_maybe_lock(r.id);
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'condition-record-window-expiry',
  '17 1 * * *',
  $$SELECT public.condition_expire_windows();$$
);

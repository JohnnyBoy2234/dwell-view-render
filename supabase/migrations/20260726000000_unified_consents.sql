-- Unify the three separate consent records (credit-check, condition-report
-- approval, lease e-signature) into one admin-searchable `consents` table,
-- generalizing the existing credit_check_consents table rather than adding
-- a fourth parallel representation.

ALTER TABLE public.credit_check_consents RENAME TO consents;
ALTER TABLE public.consents RENAME COLUMN tenant_id TO user_id;
ALTER TABLE public.consents RENAME COLUMN consented_at TO created_at;

-- Drop the old application/tenant-shaped policies before the columns they
-- reference change shape (the landlord policy depends on application_id).
DROP POLICY IF EXISTS "Tenants insert their own consent records" ON public.consents;
DROP POLICY IF EXISTS "Tenants view their own consent records" ON public.consents;
DROP POLICY IF EXISTS "Landlords view consent records for their applications" ON public.consents;

ALTER TABLE public.consents
  ADD COLUMN consent_type TEXT NOT NULL DEFAULT 'credit_check'
    CHECK (consent_type IN ('credit_check', 'condition_approval', 'lease_esignature')),
  ADD COLUMN subject_type TEXT
    CHECK (subject_type IN ('application', 'condition_record', 'lease')),
  ADD COLUMN subject_id UUID,
  ADD COLUMN counterparty_id UUID;

UPDATE public.consents SET subject_type = 'application', subject_id = application_id;

ALTER TABLE public.consents
  ALTER COLUMN subject_type SET NOT NULL,
  ALTER COLUMN subject_id SET NOT NULL,
  ALTER COLUMN consent_type DROP DEFAULT;

-- No FK on subject_id — it spans three different parent tables. Accepted
-- trade-off: consent rows now outlive their subject on delete (correct for
-- an audit log) instead of the old ON DELETE CASCADE via application_id.
ALTER TABLE public.consents DROP COLUMN application_id;
ALTER TABLE public.consents DROP COLUMN terms_version; -- dead column, never populated

CREATE INDEX idx_consents_user_id ON public.consents(user_id);
CREATE INDEX idx_consents_counterparty_id ON public.consents(counterparty_id);
CREATE INDEX idx_consents_consent_type ON public.consents(consent_type);
CREATE INDEX idx_consents_subject ON public.consents(subject_type, subject_id);
CREATE INDEX idx_consents_created_at ON public.consents(created_at DESC);

-- Server-computed counterparty (never trust client input for who else gets
-- read access) — derived from the relevant parent table per subject_type.
CREATE OR REPLACE FUNCTION public.consents_set_counterparty()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.subject_type = 'application' THEN
    SELECT CASE WHEN NEW.user_id = a.tenant_id THEN a.landlord_id ELSE a.tenant_id END
    INTO NEW.counterparty_id FROM applications a WHERE a.id = NEW.subject_id;
  ELSIF NEW.subject_type = 'condition_record' THEN
    SELECT CASE WHEN NEW.user_id = t.tenant_id THEN t.landlord_id ELSE t.tenant_id END
    INTO NEW.counterparty_id
    FROM condition_records cr JOIN tenancies t ON t.id = cr.tenancy_id
    WHERE cr.id = NEW.subject_id;
  ELSIF NEW.subject_type = 'lease' THEN
    SELECT CASE WHEN NEW.user_id = lc.tenant_id THEN lc.landlord_id ELSE lc.tenant_id END
    INTO NEW.counterparty_id FROM lease_contracts lc WHERE lc.id = NEW.subject_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consents_set_counterparty_trg ON public.consents;
CREATE TRIGGER consents_set_counterparty_trg
BEFORE INSERT ON public.consents
FOR EACH ROW EXECUTE FUNCTION public.consents_set_counterparty();

-- RLS: recreate as generalized policies. Append-only — no UPDATE/DELETE
-- policy at all.
CREATE POLICY "Consenters insert their own consent records"
ON public.consents FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view their own consent records"
ON public.consents FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Counterparties view their consent records"
ON public.consents FOR SELECT USING (counterparty_id = auth.uid());

CREATE POLICY "Admins can view all consents"
ON public.consents FOR SELECT USING (public.is_admin(auth.uid()));

-- Condition-report approval: fold the consents insert into the existing
-- condition_approve RPC (same transaction/row lock, not a second client
-- insert). condition_sign_receipt is intentionally NOT touched here — it has
-- been dead code since 20260720000000_condition_skip_receipt.sql, which
-- collapsed the live flow straight to awaiting_approval.
CREATE OR REPLACE FUNCTION public.condition_approve(
  p_record_id UUID, p_ip TEXT DEFAULT NULL, p_ua TEXT DEFAULT NULL,
  p_consent TEXT DEFAULT NULL, p_consent_version TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t UUID; v_l UUID; v_state TEXT; v_party TEXT; v_new BOOLEAN;
BEGIN
  SELECT t.tenant_id, t.landlord_id, r.state INTO v_t, v_l, v_state
  FROM condition_records r JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = p_record_id FOR UPDATE OF r;
  IF NOT FOUND THEN RAISE EXCEPTION 'Condition record not found'; END IF;
  IF v_state <> 'awaiting_approval' THEN RAISE EXCEPTION 'Not awaiting approval'; END IF;
  IF auth.uid() = v_t THEN v_party := 'tenant';
  ELSIF auth.uid() = v_l THEN v_party := 'landlord';
  ELSE RAISE EXCEPTION 'Not a party to this record'; END IF;

  WITH ins AS (
    INSERT INTO condition_signatures (record_id, signer_id, party, kind, ip, user_agent, consent_text)
    VALUES (p_record_id, auth.uid(), v_party, 'approval', p_ip, p_ua, p_consent)
    ON CONFLICT (record_id, party, kind) DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM ins) INTO v_new;

  IF v_new THEN
    INSERT INTO consents (user_id, consent_type, subject_type, subject_id, consented, consent_version, consent_text_snapshot, user_agent)
    VALUES (auth.uid(), 'condition_approval', 'condition_record', p_record_id, true,
            COALESCE(p_consent_version, 'unversioned'), COALESCE(p_consent, ''), p_ua);
  END IF;

  IF v_party = 'tenant' THEN
    UPDATE condition_records SET tenant_attested_at = COALESCE(tenant_attested_at, now()), tenant_attested_by = COALESCE(tenant_attested_by, auth.uid()) WHERE id = p_record_id;
  ELSE
    UPDATE condition_records SET landlord_attested_at = COALESCE(landlord_attested_at, now()), landlord_attested_by = COALESCE(landlord_attested_by, auth.uid()) WHERE id = p_record_id;
  END IF;
  PERFORM condition_audit(p_record_id, 'approved', jsonb_build_object('party', v_party));
  PERFORM condition_maybe_lock(p_record_id);
END;
$$;

-- Auto-approval cron: join tenancies to get tenant/landlord ids in scope,
-- and record a matching consents row per auto-approved party.
CREATE OR REPLACE FUNCTION public.condition_expire_windows()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT cr.id, cr.tenant_receipt_at, cr.landlord_receipt_at,
           cr.tenant_attested_at, cr.landlord_attested_at,
           t.tenant_id, t.landlord_id
    FROM condition_records cr
    JOIN tenancies t ON t.id = cr.tenancy_id
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
      INSERT INTO consents (user_id, consent_type, subject_type, subject_id, consented, consent_version, consent_text_snapshot)
      VALUES (r.tenant_id, 'condition_approval', 'condition_record', r.id, true, 'auto',
              'Auto-approved after the review window closed without a response.');
    END IF;
    IF r.landlord_attested_at IS NULL THEN
      UPDATE condition_records SET landlord_attested_at = now() WHERE id = r.id;
      INSERT INTO condition_signatures (record_id, party, kind, auto, consent_text)
      VALUES (r.id, 'landlord', 'approval', true, 'Auto-approved after the review window closed without a response.')
      ON CONFLICT (record_id, party, kind) DO NOTHING;
      INSERT INTO condition_record_audit (record_id, action, details)
      VALUES (r.id, 'auto_approved', jsonb_build_object('party', 'landlord'));
      INSERT INTO consents (user_id, consent_type, subject_type, subject_id, consented, consent_version, consent_text_snapshot)
      VALUES (r.landlord_id, 'condition_approval', 'condition_record', r.id, true, 'auto',
              'Auto-approved after the review window closed without a response.');
    END IF;
    PERFORM condition_maybe_lock(r.id);
  END LOOP;
END;
$$;

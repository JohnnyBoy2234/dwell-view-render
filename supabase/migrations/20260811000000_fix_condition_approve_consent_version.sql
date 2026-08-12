-- Landlord (and tenant) inspection sign-off was broken: the client calls
-- condition_approve with 5 named params (…p_consent_version), but only the
-- 4-arg version exists in production (the unified_consents migration that added
-- the 5-arg form was never applied). PostgREST can't match a 5-param call to the
-- 4-arg function, so "Accept"/sign-off failed. Add the parameter (and a column
-- to store it) without pulling in the unapplied consents-table rename.

ALTER TABLE public.condition_signatures ADD COLUMN IF NOT EXISTS consent_version text;

DROP FUNCTION IF EXISTS public.condition_approve(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.condition_approve(
  p_record_id uuid,
  p_ip text DEFAULT NULL::text,
  p_ua text DEFAULT NULL::text,
  p_consent text DEFAULT NULL::text,
  p_consent_version text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  INSERT INTO condition_signatures (record_id, signer_id, party, kind, ip, user_agent, consent_text, consent_version)
    VALUES (p_record_id, auth.uid(), v_party, 'approval', p_ip, p_ua, p_consent, p_consent_version)
    ON CONFLICT (record_id, party, kind) DO NOTHING;
  IF v_party = 'tenant' THEN
    UPDATE condition_records SET tenant_attested_at = COALESCE(tenant_attested_at, now()),
      tenant_attested_by = COALESCE(tenant_attested_by, auth.uid()) WHERE id = p_record_id;
  ELSE
    UPDATE condition_records SET landlord_attested_at = COALESCE(landlord_attested_at, now()),
      landlord_attested_by = COALESCE(landlord_attested_by, auth.uid()) WHERE id = p_record_id;
  END IF;
  PERFORM condition_audit(p_record_id, 'approved', jsonb_build_object('party', v_party));
  PERFORM condition_maybe_lock(p_record_id);
END; $function$;

GRANT EXECUTE ON FUNCTION public.condition_approve(uuid, text, text, text, text) TO authenticated;

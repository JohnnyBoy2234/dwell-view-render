-- condition_approve recorded the signature/consent/audit but never notified the
-- OTHER party — so a landlord got nothing when the tenant approved the move-in/
-- out condition report (inspection). Notify the counterparty on a genuine new
-- approval. Everything else is unchanged.
CREATE OR REPLACE FUNCTION public.condition_approve(
  p_record_id UUID, p_ip TEXT DEFAULT NULL, p_ua TEXT DEFAULT NULL,
  p_consent TEXT DEFAULT NULL, p_consent_version TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
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

    -- Notify the other party (this was the missing piece).
    IF v_party = 'tenant' THEN
      PERFORM create_notification(
        v_l,
        'Condition report approved',
        'Your tenant approved the condition report.',
        '/landlord/dashboard/condition-records',
        'condition_record',
        jsonb_build_object('record_id', p_record_id)
      );
    ELSE
      PERFORM create_notification(
        v_t,
        'Condition report approved',
        'Your landlord approved the condition report.',
        '/tenant-dashboard/condition-records',
        'condition_record',
        jsonb_build_object('record_id', p_record_id)
      );
    END IF;
  END IF;

  IF v_party = 'tenant' THEN
    UPDATE condition_records SET tenant_attested_at = COALESCE(tenant_attested_at, now()), tenant_attested_by = COALESCE(tenant_attested_by, auth.uid()) WHERE id = p_record_id;
  ELSE
    UPDATE condition_records SET landlord_attested_at = COALESCE(landlord_attested_at, now()), landlord_attested_by = COALESCE(landlord_attested_by, auth.uid()) WHERE id = p_record_id;
  END IF;
  PERFORM condition_audit(p_record_id, 'approved', jsonb_build_object('party', v_party));
  PERFORM condition_maybe_lock(p_record_id);
END;
$function$;

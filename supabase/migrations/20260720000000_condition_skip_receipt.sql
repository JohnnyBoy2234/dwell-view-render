-- Collapse the inspection sign-off to a single approve-or-dispute stage.
--
-- Previously "Ready to sign off" moved the record to `awaiting_receipts`,
-- where each party first confirmed receipt before a 7-day approval window
-- opened. That receipt step added friction without adding protection, so it
-- is removed: signing off now opens the 7-day approval window immediately and
-- both parties either approve or raise a dispute.
--
-- The `awaiting_receipts` state and the condition_sign_receipt RPC are left in
-- place (unused) to avoid touching dependent CHECK constraints and RLS.

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
  -- Straight to the approval window — no receipt step.
  UPDATE condition_records
    SET state = 'awaiting_approval',
        signoff_at = now(),
        signoff_by = auth.uid(),
        window_started_at = now()
  WHERE id = p_record_id;
  PERFORM condition_audit(p_record_id, 'sent_for_signoff');
  PERFORM condition_audit(p_record_id, 'approval_window_opened');
END;
$$;

-- Move any records already parked at the receipt stage straight into the
-- approval window so the flow change doesn't strand them.
UPDATE condition_records
SET state = 'awaiting_approval',
    window_started_at = COALESCE(window_started_at, now())
WHERE state = 'awaiting_receipts';

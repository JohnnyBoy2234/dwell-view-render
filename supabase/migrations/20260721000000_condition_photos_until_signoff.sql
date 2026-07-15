-- Let both parties document an inspection until they personally sign off.
--
-- The previous guard only allowed non-dispute photos while the record was
-- `open`, so whoever pressed "Ready to sign off" first froze photos for both
-- sides. Now each party may keep adding their own photos until the record is
-- locked AND until that party has attested — once you approve, your set is
-- final. Dispute photos are still limited to the review window.

CREATE OR REPLACE FUNCTION public.condition_photos_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_state TEXT;
  v_tenant UUID;
  v_landlord UUID;
  v_tenant_at TIMESTAMPTZ;
  v_landlord_at TIMESTAMPTZ;
BEGIN
  SELECT r.state, t.tenant_id, t.landlord_id, r.tenant_attested_at, r.landlord_attested_at
  INTO v_state, v_tenant, v_landlord, v_tenant_at, v_landlord_at
  FROM condition_records r
  JOIN tenancies t ON t.id = r.tenancy_id
  WHERE r.id = NEW.record_id;

  IF NEW.dispute_id IS NOT NULL THEN
    IF v_state <> 'awaiting_approval' THEN
      RAISE EXCEPTION 'Dispute photos can only be added during the review window';
    END IF;
  ELSE
    IF v_state = 'locked' THEN
      RAISE EXCEPTION 'This inspection is locked';
    END IF;
    IF (NEW.uploaded_by = v_tenant AND v_tenant_at IS NOT NULL)
       OR (NEW.uploaded_by = v_landlord AND v_landlord_at IS NOT NULL) THEN
      RAISE EXCEPTION 'You have already signed off; your photos are final';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

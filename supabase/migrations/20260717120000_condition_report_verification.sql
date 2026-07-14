-- Condition Report — QR verification layer: a human-readable report reference,
-- an unguessable verification token (in the QR URL), and a content hash (the
-- report's digital fingerprint, computed at lock time by the PDF function).

CREATE SEQUENCE IF NOT EXISTS public.condition_report_ref_seq;

ALTER TABLE public.condition_records
  ADD COLUMN IF NOT EXISTS verify_token UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS report_ref TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_condition_records_verify_token ON public.condition_records(verify_token);

-- Assign the human-readable reference (CR-YYYY-000123) exactly at lock, then
-- fire the PDF function which computes and stores the content hash + QR.
CREATE OR REPLACE FUNCTION public.condition_maybe_lock(p_record_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_rec condition_records%ROWTYPE;
BEGIN
  SELECT * INTO v_rec FROM condition_records WHERE id = p_record_id FOR UPDATE;
  IF v_rec.tenant_attested_at IS NOT NULL AND v_rec.landlord_attested_at IS NOT NULL AND v_rec.state <> 'locked' THEN
    UPDATE condition_records
    SET state = 'locked',
        report_ref = COALESCE(report_ref, 'CR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('condition_report_ref_seq')::text, 6, '0'))
    WHERE id = p_record_id;
    PERFORM condition_audit(p_record_id, 'locked');
    PERFORM net.http_post(
      url := 'https://rsfrvjaqxhoqavvscvwf.supabase.co/functions/v1/generate-condition-report-pdf',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZnJ2amFxeGhvcWF2dnNjdndmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIzOTYsImV4cCI6MjA2OTg3ODM5Nn0.3yeCVbJs6twyx62wYh9BxCUoqpqiMt-174JmdRyhJig'),
      body := jsonb_build_object('record_id', p_record_id)
    );
  END IF;
END; $fn$;

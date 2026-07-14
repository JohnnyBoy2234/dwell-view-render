-- Condition-record notifications deep-link to the record (the detail view is
-- now a route: /condition-records/:id), and the weekly reminder stops after
-- 90 days instead of nagging abandoned records forever.

-- Move-in trigger: link both parties straight to the new record.
CREATE OR REPLACE FUNCTION public.create_move_in_condition_record()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_record_id UUID;
BEGIN
    IF NEW.status = 'active' THEN
        INSERT INTO condition_records (tenancy_id, event_type)
        VALUES (NEW.id, 'move_in')
        ON CONFLICT (tenancy_id, event_type) DO NOTHING
        RETURNING id INTO v_record_id;

        IF v_record_id IS NOT NULL THEN
            PERFORM public.create_notification(
                NEW.tenant_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/tenant-dashboard/condition-records/' || v_record_id,
                'condition_record',
                jsonb_build_object('tenancy_id', NEW.id, 'record_id', v_record_id)
            );
            PERFORM public.create_notification(
                NEW.landlord_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/enhancedlandlorddashboard/condition-records/' || v_record_id,
                'condition_record',
                jsonb_build_object('tenancy_id', NEW.id, 'record_id', v_record_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- cron.schedule with an existing jobname replaces the job in place.
SELECT cron.schedule(
  'condition-record-move-out-daily',
  '10 5 * * *',
  $$
  WITH created AS (
    INSERT INTO public.condition_records (tenancy_id, event_type)
    SELECT t.id, 'move_out'
    FROM public.tenancies t
    WHERE t.status = 'active'
      AND t.end_date <= (current_date + 14)
    ON CONFLICT (tenancy_id, event_type) DO NOTHING
    RETURNING id, tenancy_id
  )
  SELECT
    public.create_notification(
      t.tenant_id,
      'Your move-out condition record has been started. Photograph the property before handover.',
      '/tenant-dashboard/condition-records/' || c.id,
      'condition_record',
      jsonb_build_object('tenancy_id', t.id, 'record_id', c.id)
    ),
    public.create_notification(
      t.landlord_id,
      'A move-out condition record has been started for your property. Photograph it before handover.',
      '/enhancedlandlorddashboard/condition-records/' || c.id,
      'condition_record',
      jsonb_build_object('tenancy_id', t.id, 'record_id', c.id)
    )
  FROM created c
  JOIN public.tenancies t ON t.id = c.tenancy_id;
  $$
);

-- Weekly nag now stops 90 days after the record was created (~13 reminders);
-- an unattested record older than that is abandoned, not forgotten.
SELECT cron.schedule(
  'condition-record-reminders-weekly',
  '0 6 * * 1',
  $$
  SELECT public.create_notification(
    u.user_id,
    'Reminder: the ' || replace(r.event_type, '_', '-') || ' condition record is awaiting your attestation.',
    u.link_url,
    'condition_record',
    jsonb_build_object('record_id', r.id)
  )
  FROM public.condition_records r
  JOIN public.tenancies t ON t.id = r.tenancy_id
  CROSS JOIN LATERAL (
    SELECT t.tenant_id AS user_id,
           '/tenant-dashboard/condition-records/' || r.id AS link_url
    WHERE r.tenant_attested_at IS NULL
    UNION ALL
    SELECT t.landlord_id,
           '/enhancedlandlorddashboard/condition-records/' || r.id
    WHERE r.landlord_attested_at IS NULL
  ) u
  WHERE NOT r.locked
    AND r.created_at > now() - interval '90 days';
  $$
);

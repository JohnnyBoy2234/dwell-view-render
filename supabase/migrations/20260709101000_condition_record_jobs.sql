-- Pure-SQL scheduled jobs (no edge function needed — unlike billing-cycle, there is
-- no external side effect here, just inserts).

-- Daily 05:10 UTC: auto-create the move-out condition record 14 days before tenancy
-- end and notify both parties. ON CONFLICT makes it idempotent; the unique constraint
-- also absorbs races with manual creation (early terminations are handled by the
-- manual "start move-out record" action in the UI).
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
    RETURNING tenancy_id
  )
  SELECT
    public.create_notification(
      t.tenant_id,
      'Your move-out condition record has been started. Photograph the property before handover.',
      '/tenant-dashboard/condition-records',
      'condition_record',
      jsonb_build_object('tenancy_id', t.id)
    ),
    public.create_notification(
      t.landlord_id,
      'A move-out condition record has been started for your property. Photograph it before handover.',
      '/enhancedlandlorddashboard/condition-records',
      'condition_record',
      jsonb_build_object('tenancy_id', t.id)
    )
  FROM created c
  JOIN public.tenancies t ON t.id = c.tenancy_id;
  $$
);

-- Weekly Monday 06:00 UTC: nag each party who has not yet attested an open record.
-- No reminder-tracking table: the weekly cadence IS the throttle.
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
    SELECT t.tenant_id AS user_id, '/tenant-dashboard/condition-records' AS link_url
    WHERE r.tenant_attested_at IS NULL
    UNION ALL
    SELECT t.landlord_id, '/enhancedlandlorddashboard/condition-records'
    WHERE r.landlord_attested_at IS NULL
  ) u
  WHERE NOT r.locked;
  $$
);

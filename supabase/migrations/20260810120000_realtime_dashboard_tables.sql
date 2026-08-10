-- Broaden realtime coverage for the landlord dashboard.
--
-- Postgres only streams `postgres_changes` for tables in the supabase_realtime
-- publication. 20260736000000 added applications + notifications; this adds the
-- rest of the tables the dashboard subscribes to (application requests/invites,
-- maintenance, tenancies, lease contracts) so those tabs update live instead of
-- only on reload. Idempotent — re-running (or a table already added directly) is
-- a no-op. RLS still applies to realtime, so users only receive changes for rows
-- they can select.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'applications',
    'application_requests',
    'application_invites',
    'maintenance_requests',
    'tenancies',
    'notifications',
    'lease_contracts'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

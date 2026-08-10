-- Applications never appeared on the landlord's dashboard until a manual
-- refresh: useLandlordApplications subscribes to postgres_changes on
-- public.applications, but the table was never added to the realtime
-- publication, so the subscription never fired. Same for notifications, which
-- feeds the bell. Guarded so re-running (or a table already added from the
-- dashboard) is a no-op.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

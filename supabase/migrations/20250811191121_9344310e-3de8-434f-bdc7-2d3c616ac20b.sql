-- Viewing completion workflow: allow tenants to mark their past bookings as completed
-- This adds a new RLS policy for tenants on viewing_slots

-- guarded: viewing_slots absent at this point on fresh local replay (created later, in 20250908173351)
DO $$
BEGIN
  IF to_regclass('public.viewing_slots') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'viewing_slots' AND policyname = 'Tenants can mark their past bookings as completed'
  ) THEN
    CREATE POLICY "Tenants can mark their past bookings as completed"
    ON public.viewing_slots
    FOR UPDATE
    USING (
      booked_by_tenant_id = auth.uid()
      AND status = 'booked'
      AND start_time <= now()
    )
    WITH CHECK (
      status = 'completed'
      AND booked_by_tenant_id = auth.uid()
    );
  END IF;
END$$;
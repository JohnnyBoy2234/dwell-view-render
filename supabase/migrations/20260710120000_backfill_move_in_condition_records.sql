-- Backfill move-in condition records for tenancies that existed before
-- trg_create_move_in_condition_record (20260710110000) — the trigger only
-- fires on INSERT, so pre-existing active tenancies had no records and their
-- parties saw an empty Condition Records page. Mirrors the trigger exactly:
-- record + one notification per party, only where the record was missing.

DO $$
DECLARE
    t RECORD;
    v_record_id UUID;
BEGIN
    FOR t IN
        SELECT id, tenant_id, landlord_id
        FROM public.tenancies
        WHERE status = 'active'
    LOOP
        INSERT INTO public.condition_records (tenancy_id, event_type)
        VALUES (t.id, 'move_in')
        ON CONFLICT (tenancy_id, event_type) DO NOTHING
        RETURNING id INTO v_record_id;

        IF v_record_id IS NOT NULL THEN
            PERFORM public.create_notification(
                t.tenant_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/tenant-dashboard/condition-records',
                'condition_record',
                jsonb_build_object('tenancy_id', t.id, 'record_id', v_record_id)
            );
            PERFORM public.create_notification(
                t.landlord_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/enhancedlandlorddashboard/condition-records',
                'condition_record',
                jsonb_build_object('tenancy_id', t.id, 'record_id', v_record_id)
            );
        END IF;
    END LOOP;
END $$;

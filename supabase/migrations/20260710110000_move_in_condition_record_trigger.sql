-- Move-in condition record starts automatically with the tenancy (ADR-0004).
--
-- Originally planned inside the sign-lease-contract edge function, but
-- 20260708150000 moved tenancy creation into the trg_create_tenancy_from_signed_lease
-- DB trigger, which made the function's tenancy block (and anything added to it)
-- dead code. A tenancies AFTER INSERT trigger is the one spot that covers every
-- creation path: the signing trigger, the edge-function fallback, and manual inserts.

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

        -- Notify only when this insert actually created the record.
        IF v_record_id IS NOT NULL THEN
            PERFORM public.create_notification(
                NEW.tenant_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/tenant-dashboard/condition-records',
                'condition_record',
                jsonb_build_object('tenancy_id', NEW.id, 'record_id', v_record_id)
            );
            PERFORM public.create_notification(
                NEW.landlord_id,
                'Your move-in condition record has been started. Photograph the property at handover.',
                '/enhancedlandlorddashboard/condition-records',
                'condition_record',
                jsonb_build_object('tenancy_id', NEW.id, 'record_id', v_record_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_move_in_condition_record ON public.tenancies;
CREATE TRIGGER trg_create_move_in_condition_record
    AFTER INSERT ON public.tenancies
    FOR EACH ROW EXECUTE FUNCTION public.create_move_in_condition_record();

-- Smoke test for condition record lifecycle rules. Run against local supabase:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/condition_records.test.sql
BEGIN;

DO $$
DECLARE
    v_tenant UUID := gen_random_uuid();
    v_landlord UUID := gen_random_uuid();
    v_property UUID;
    v_tenancy UUID;
    v_record UUID;
    v_photo UUID;
    v_first_attest TIMESTAMPTZ;
    r RECORD;
    v_errored BOOLEAN := false;
BEGIN
    INSERT INTO auth.users (id, email) VALUES (v_tenant, 'crt-tenant@test.local');
    INSERT INTO auth.users (id, email) VALUES (v_landlord, 'crt-landlord@test.local');

    INSERT INTO public.properties (landlord_id, title, description, location, price, property_type)
    VALUES (v_landlord, 'CRT test property', 'smoke test', 'Testville', 1000, 'apartment')
    RETURNING id INTO v_property;

    INSERT INTO public.tenancies (property_id, tenant_id, landlord_id, start_date, end_date, monthly_rent, status)
    VALUES (v_property, v_tenant, v_landlord, current_date, current_date + 365, 1000, 'active')
    RETURNING id INTO v_tenancy;

    -- 0. active tenancy insert auto-creates the move-in record (AFTER INSERT trigger)
    SELECT id INTO v_record FROM public.condition_records
    WHERE tenancy_id = v_tenancy AND event_type = 'move_in';
    IF v_record IS NULL THEN
        RAISE EXCEPTION 'TEST FAIL: move-in record not auto-created with tenancy';
    END IF;

    -- 1. duplicate event for same tenancy is rejected
    BEGIN
        INSERT INTO public.condition_records (tenancy_id, event_type) VALUES (v_tenancy, 'move_in');
        RAISE EXCEPTION 'TEST FAIL: duplicate (tenancy, event) accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    -- 2. tenant attests via RPC; who-attested audit is recorded (direction 1:
    --    landlord reads the same row, so tenant attestation is visible to them)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NULL OR r.tenant_attested_by IS DISTINCT FROM v_tenant OR r.locked THEN
        RAISE EXCEPTION 'TEST FAIL: tenant attestation not recorded correctly';
    END IF;
    v_first_attest := r.tenant_attested_at;

    -- 3. attest is per-party idempotent: repeat call keeps the first timestamp
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS DISTINCT FROM v_first_attest THEN
        RAISE EXCEPTION 'TEST FAIL: repeat attestation changed the timestamp';
    END IF;

    -- 4. landlord photo insert does NOT clear the tenant''s attestation
    --    (per-party sets: one party''s changes never touch the other''s status)
    INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
    VALUES (v_record, v_landlord, 'Kitchen', v_record || '/a.jpg')
    RETURNING id INTO v_photo;
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NULL THEN
        RAISE EXCEPTION 'TEST FAIL: landlord photo insert cleared tenant attestation';
    END IF;

    -- 5. tenant''s own set is locked by their attestation: no more inserts
    BEGIN
        INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
        VALUES (v_record, v_tenant, 'Kitchen', v_record || '/b.jpg');
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: attested party allowed to add photos';
    END IF;

    -- 6. saved photos can never be deleted, even while the record is open
    BEGIN
        DELETE FROM public.condition_photos WHERE id = v_photo;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: photo delete allowed on open record';
    END IF;

    -- 7. duplicate storage_path is rejected (retry-safe uploads)
    BEGIN
        INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
        VALUES (v_record, v_landlord, 'Kitchen', v_record || '/a.jpg');
        RAISE EXCEPTION 'TEST FAIL: duplicate storage_path accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    -- 8. a stranger cannot attest (must run while open: attest is a no-op once locked)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    BEGIN
        PERFORM public.attest_condition_record(v_record);
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: non-party allowed to attest';
    END IF;

    -- 9. landlord attests -> locked, audit recorded (direction 2: tenant sees it)
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF NOT r.locked OR r.landlord_attested_by IS DISTINCT FROM v_landlord
        OR r.tenant_attested_at IS DISTINCT FROM v_first_attest THEN
        RAISE EXCEPTION 'TEST FAIL: record not locked correctly after both attestations';
    END IF;

    -- 10. photo inserts on a locked record are refused
    BEGIN
        INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
        VALUES (v_record, v_landlord, 'Kitchen', v_record || '/c.jpg');
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: photo insert allowed on locked record';
    END IF;

    -- 11. notes on a locked record are refused
    BEGIN
        PERFORM public.set_condition_notes(v_record, 'too late');
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: notes edit allowed on locked record';
    END IF;

    -- 12. attest on a locked record is a silent no-op, even for a stranger
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);

    -- 13. deleting the tenancy still cascades through photos (the delete guard
    --     only blocks direct deletes while the parent record exists)
    DELETE FROM public.tenancies WHERE id = v_tenancy;
    IF EXISTS (SELECT 1 FROM public.condition_photos WHERE id = v_photo) THEN
        RAISE EXCEPTION 'TEST FAIL: cascade delete did not remove photos';
    END IF;

    RAISE NOTICE 'condition_records smoke test: ALL PASS';
END $$;

ROLLBACK;

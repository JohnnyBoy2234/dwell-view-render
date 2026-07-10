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

    INSERT INTO public.condition_records (tenancy_id, event_type)
    VALUES (v_tenancy, 'move_in')
    RETURNING id INTO v_record;

    -- 1. duplicate event for same tenancy is rejected
    BEGIN
        INSERT INTO public.condition_records (tenancy_id, event_type) VALUES (v_tenancy, 'move_in');
        RAISE EXCEPTION 'TEST FAIL: duplicate (tenancy, event) accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;

    -- 2. tenant attests via RPC
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NULL OR r.locked THEN
        RAISE EXCEPTION 'TEST FAIL: tenant attestation not recorded correctly';
    END IF;

    -- 3. photo insert clears existing attestations
    INSERT INTO public.condition_photos (record_id, uploaded_by, location_tag, storage_path)
    VALUES (v_record, v_landlord, 'Kitchen', v_record || '/a.jpg')
    RETURNING id INTO v_photo;
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF r.tenant_attested_at IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAIL: photo insert did not clear attestations';
    END IF;

    -- 4. a stranger cannot attest (must run while open: attest is a no-op once locked)
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

    -- 5. both attest -> locked
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);
    SELECT * INTO r FROM public.condition_records WHERE id = v_record;
    IF NOT r.locked THEN
        RAISE EXCEPTION 'TEST FAIL: record not locked after both attestations';
    END IF;

    -- 6. photo changes on a locked record are refused
    BEGIN
        DELETE FROM public.condition_photos WHERE id = v_photo;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: photo delete allowed on locked record';
    END IF;

    -- 7. notes on a locked record are refused
    BEGIN
        PERFORM public.set_condition_notes(v_record, 'too late');
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: notes edit allowed on locked record';
    END IF;

    -- 8. attest on a locked record is a silent no-op, even for a stranger
    PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    PERFORM public.attest_condition_record(v_record);

    RAISE NOTICE 'condition_records smoke test: ALL PASS';
END $$;

ROLLBACK;

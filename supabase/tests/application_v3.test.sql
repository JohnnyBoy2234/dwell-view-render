-- Smoke test for rental-application v3 server-side rules: status transitions,
-- snapshot immutability, info-request guard, and audit/notes visibility.
-- Run against local supabase:
--   docker exec -i supabase_db_<ref> psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < supabase/tests/application_v3.test.sql
BEGIN;

DO $$
DECLARE
    v_tenant UUID := gen_random_uuid();
    v_landlord UUID := gen_random_uuid();
    v_stranger UUID := gen_random_uuid();
    v_property UUID;
    v_property2 UUID;
    v_app UUID;
    v_app2 UUID;
    v_request UUID;
    v_count INT;
BEGIN
    INSERT INTO auth.users (id, email) VALUES
      (v_tenant, 'appv3-tenant@test.local'),
      (v_landlord, 'appv3-landlord@test.local'),
      (v_stranger, 'appv3-stranger@test.local');

    INSERT INTO public.properties (landlord_id, title, description, location, price, property_type)
    VALUES (v_landlord, 'AppV3 test property', 'smoke test', 'Testville', 9000, 'apartment')
    RETURNING id INTO v_property;
    INSERT INTO public.properties (landlord_id, title, description, location, price, property_type)
    VALUES (v_landlord, 'AppV3 test property 2', 'smoke test', 'Testville', 9000, 'apartment')
    RETURNING id INTO v_property2;

    -- ── tenant submits ────────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);

    INSERT INTO public.applications (tenant_id, landlord_id, property_id, status, submitted_at, snapshot, version)
    VALUES (v_tenant, v_landlord, v_property, 'pending', now(), '{"personal":{"first_name":"Test"}}'::jsonb, 2)
    RETURNING id INTO v_app;

    SELECT count(*) INTO v_count FROM public.application_events
    WHERE application_id = v_app AND event_type = 'submitted';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAIL: submitted event not logged';
    END IF;

    -- tenant cannot approve their own application
    BEGIN
        UPDATE public.applications SET status = 'accepted' WHERE id = v_app;
        RAISE EXCEPTION 'TEST FAIL: tenant approved their own application';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'TEST FAIL%' THEN RAISE; END IF;
    END;

    -- ── landlord review ───────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);

    -- landlord cannot change the submitted answers
    BEGIN
        UPDATE public.applications SET snapshot = '{"personal":{"first_name":"Forged"}}'::jsonb WHERE id = v_app;
        RAISE EXCEPTION 'TEST FAIL: landlord edited the snapshot';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'TEST FAIL%' THEN RAISE; END IF;
    END;

    -- landlord asks for more information
    INSERT INTO public.application_info_requests (application_id, landlord_id, tenant_id, item, message)
    VALUES (v_app, v_landlord, v_tenant, 'Updated bank statement', 'Please send June and July.')
    RETURNING id INTO v_request;
    UPDATE public.applications SET status = 'more_info_requested' WHERE id = v_app;

    -- landlord private note
    INSERT INTO public.application_notes (application_id, landlord_id, note)
    VALUES (v_app, v_landlord, 'Called the reference — positive.');

    -- ── tenant responds ───────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);

    -- tenant cannot see the landlord's private notes
    SELECT count(*) INTO v_count FROM public.application_notes WHERE application_id = v_app;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAIL: tenant can read private landlord notes';
    END IF;

    -- tenant cannot rewrite what was asked
    BEGIN
        UPDATE public.application_info_requests SET item = 'Nothing at all' WHERE id = v_request;
        RAISE EXCEPTION 'TEST FAIL: tenant rewrote the info request';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'TEST FAIL%' THEN RAISE; END IF;
    END;

    -- but can respond, and put the application back under review
    UPDATE public.application_info_requests
    SET response = 'Statements attached.', status = 'responded', responded_at = now()
    WHERE id = v_request;
    UPDATE public.applications SET status = 'pending' WHERE id = v_app;

    SELECT count(*) INTO v_count FROM public.application_events
    WHERE application_id = v_app AND event_type = 'info_response';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAIL: info_response event not logged';
    END IF;

    -- ── landlord decides ──────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);
    UPDATE public.applications SET status = 'accepted' WHERE id = v_app;

    -- the decision is terminal
    BEGIN
        UPDATE public.applications SET status = 'declined' WHERE id = v_app;
        RAISE EXCEPTION 'TEST FAIL: terminal decision was reversed';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM LIKE 'TEST FAIL%' THEN RAISE; END IF;
    END;

    SELECT count(*) INTO v_count FROM public.application_events
    WHERE application_id = v_app AND event_type = 'status_changed'
      AND detail->>'to' = 'accepted';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST FAIL: approval not in the audit trail';
    END IF;

    -- approving must NOT create any lease
    SELECT count(*) INTO v_count FROM public.lease_contracts
    WHERE property_id = v_property AND tenant_id = v_tenant;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAIL: approval created a lease';
    END IF;

    -- ── tenant withdrawal on a second application ─────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_tenant, 'role', 'authenticated')::text, true);
    INSERT INTO public.applications (tenant_id, landlord_id, property_id, status, submitted_at, snapshot)
    VALUES (v_tenant, v_landlord, v_property2, 'pending', now(), '{}'::jsonb)
    RETURNING id INTO v_app2;
    UPDATE public.applications SET status = 'withdrawn' WHERE id = v_app2;

    -- ── stranger sees nothing ─────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
    SELECT count(*) INTO v_count FROM public.application_events WHERE application_id = v_app;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAIL: stranger can read the audit trail';
    END IF;
    SELECT count(*) INTO v_count FROM public.application_info_requests WHERE application_id = v_app;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST FAIL: stranger can read info requests';
    END IF;

    RAISE NOTICE 'application_v3.test.sql: all assertions passed';
END $$;

ROLLBACK;

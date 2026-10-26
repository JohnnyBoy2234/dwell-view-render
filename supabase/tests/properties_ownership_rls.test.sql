-- Smoke test for the property-ownership RLS/trigger guard: a landlord must
-- never be able to self-set ownership_status to 'verified'/'declined' or
-- touch ownership_verified_at/ownership_reviewed_by directly, but the real
-- title-deed upload flow (not_submitted/declined -> submitted) and ordinary
-- edits to unrelated columns must keep working, including after a property
-- has been through one or more admin reviews. See
-- supabase/migrations/20261026150000_fix_properties_ownership_rls_bypass.sql
-- and 20261026150500_harden_ownership_rls_trigger.sql.
-- Run against local supabase:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/properties_ownership_rls.test.sql
BEGIN;

DO $$
DECLARE
    v_landlord UUID := gen_random_uuid();
    v_admin UUID := gen_random_uuid();
    v_property UUID;
    r RECORD;
    v_errored BOOLEAN;
BEGIN
    INSERT INTO auth.users (id, email) VALUES
      (v_landlord, 'ownrls-landlord@test.local'),
      (v_admin, 'ownrls-admin@test.local');

    INSERT INTO public.user_roles (user_id, role) VALUES
      (v_landlord, 'landlord'),
      (v_admin, 'admin');

    INSERT INTO public.properties (landlord_id, title, description, location, price, property_type, ownership_status)
    VALUES (v_landlord, 'OwnRLS test property', 'smoke test', 'Testville', 1000, 'apartment', 'not_submitted')
    RETURNING id INTO v_property;

    -- ── landlord: direct self-verify/self-decline attempts ─────────────────
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);

    -- 1. landlord cannot self-set ownership_status = 'verified'
    BEGIN
        UPDATE public.properties SET ownership_status = 'verified', ownership_verified_at = now() WHERE id = v_property;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: landlord self-verified ownership_status';
    END IF;

    -- 2. landlord cannot self-set ownership_status = 'declined'
    BEGIN
        UPDATE public.properties SET ownership_status = 'declined', ownership_decline_reason = 'self' WHERE id = v_property;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: landlord self-declined ownership_status';
    END IF;

    -- 3. landlord cannot overwrite ownership_reviewed_by directly
    BEGIN
        UPDATE public.properties SET ownership_reviewed_by = v_landlord WHERE id = v_property;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: landlord self-set ownership_reviewed_by';
    END IF;

    -- 4. landlord cannot sneak ownership_status = 'verified' in alongside an
    --    unrelated field edit in the same UPDATE, and the whole statement
    --    (including the unrelated field) must be rejected, not partially applied
    BEGIN
        UPDATE public.properties SET price = 2000, ownership_status = 'verified' WHERE id = v_property;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: landlord smuggled ownership_status change alongside unrelated edit';
    END IF;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.price = 2000 OR r.ownership_status = 'verified' THEN
        RAISE EXCEPTION 'TEST FAIL: rejected UPDATE partially applied';
    END IF;

    -- 5. landlord CAN move not_submitted -> submitted (the real upload flow,
    --    mirrors ListProperty.tsx's uploadTitleDeed)
    UPDATE public.properties
    SET title_deed_path = 'disposable/deed.pdf', ownership_status = 'submitted', ownership_decline_reason = null
    WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.ownership_status <> 'submitted' THEN
        RAISE EXCEPTION 'TEST FAIL: legitimate submission was not applied';
    END IF;

    -- 6. landlord CAN still edit unrelated fields while a submission is pending review
    UPDATE public.properties SET price = 1500 WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.price <> 1500 THEN
        RAISE EXCEPTION 'TEST FAIL: unrelated edit while submitted was blocked';
    END IF;

    -- ── admin: review path (has_role(admin) branch of the trigger) ─────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    -- 7. admin CAN decline (mirrors admin-decline-property-ownership's writes)
    UPDATE public.properties
    SET ownership_status = 'declined', ownership_reviewed_by = v_admin, ownership_verified_at = null, ownership_decline_reason = 'test decline'
    WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.ownership_status <> 'declined' OR r.ownership_reviewed_by IS DISTINCT FROM v_admin THEN
        RAISE EXCEPTION 'TEST FAIL: admin decline was not applied';
    END IF;

    -- ── landlord: resubmission after decline (reviewed_by now permanently
    --    non-null -- this is exactly the case a naive fixed-value WITH CHECK
    --    would have broken forever) ────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_landlord, 'role', 'authenticated')::text, true);

    -- 8. landlord CAN resubmit declined -> submitted
    UPDATE public.properties
    SET title_deed_path = 'disposable/deed2.pdf', ownership_status = 'submitted', ownership_decline_reason = null
    WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.ownership_status <> 'submitted' THEN
        RAISE EXCEPTION 'TEST FAIL: resubmission after decline was blocked';
    END IF;

    -- 9. landlord CAN still edit unrelated fields even with a review history
    --    on the row (ownership_reviewed_by stays non-null forever)
    UPDATE public.properties SET price = 1600 WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.price <> 1600 THEN
        RAISE EXCEPTION 'TEST FAIL: unrelated edit was blocked once a review history exists';
    END IF;

    -- 10. landlord still cannot self-verify after a review history exists
    BEGIN
        UPDATE public.properties SET ownership_status = 'verified' WHERE id = v_property;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: landlord self-verified after a review history existed';
    END IF;

    -- ── service-role context (the edge functions write via the service-role
    --    key, i.e. no JWT / auth.uid() IS NULL) ──────────────────────────────
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);

    -- 11. service-role context CAN verify (mirrors admin-approve-property-ownership)
    UPDATE public.properties
    SET ownership_status = 'verified', ownership_verified_at = now(), ownership_reviewed_by = v_admin, ownership_decline_reason = null
    WHERE id = v_property;
    SELECT * INTO r FROM public.properties WHERE id = v_property;
    IF r.ownership_status <> 'verified' OR r.ownership_verified_at IS NULL THEN
        RAISE EXCEPTION 'TEST FAIL: service-role approval was blocked';
    END IF;

    RAISE NOTICE 'properties_ownership_rls.test.sql: all assertions passed';
END $$;

ROLLBACK;

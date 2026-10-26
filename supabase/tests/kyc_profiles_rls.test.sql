-- Smoke test for the kyc_profiles RLS/trigger guard: a user must never be
-- able to self-set status to 'approved'/'declined' or touch
-- reviewed_by/reviewed_at directly, but the real submission/resubmission
-- flows (not_started -> submitted, declined -> not_started/submitted) and
-- admin/service-role review must keep working, including after a profile
-- has been through one or more admin reviews. See
-- supabase/migrations/20261026160000_fix_kyc_profiles_self_approval.sql.
-- Run against local supabase:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/kyc_profiles_rls.test.sql
BEGIN;

DO $$
DECLARE
    v_user UUID := gen_random_uuid();
    v_admin UUID := gen_random_uuid();
    r RECORD;
    v_errored BOOLEAN;
BEGIN
    INSERT INTO auth.users (id, email) VALUES
      (v_user, 'kycrls-user@test.local'),
      (v_admin, 'kycrls-admin@test.local');

    INSERT INTO public.user_roles (user_id, role) VALUES
      (v_admin, 'admin');

    INSERT INTO public.kyc_profiles (user_id, status)
    VALUES (v_user, 'not_started');

    -- ── user: direct self-approve/self-decline attempts ────────────────────
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

    -- 1. user cannot self-set status = 'approved' while submitted
    UPDATE public.kyc_profiles SET status = 'submitted', submitted_at = now() WHERE user_id = v_user;
    BEGIN
        UPDATE public.kyc_profiles SET status = 'approved' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user self-approved their own KYC profile';
    END IF;

    -- 2. user cannot self-set status = 'declined'
    BEGIN
        UPDATE public.kyc_profiles SET status = 'declined', notes = 'self' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user self-declined their own KYC profile';
    END IF;

    -- 3. user cannot set reviewed_by/reviewed_at directly on their own row
    BEGIN
        UPDATE public.kyc_profiles SET reviewed_by = v_user, reviewed_at = now() WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user self-set reviewed_by/reviewed_at';
    END IF;

    -- 4. user cannot smuggle status = 'approved' alongside an unrelated
    --    column edit, and the whole statement must be rejected, not
    --    partially applied
    BEGIN
        UPDATE public.kyc_profiles SET notes = 'hi', status = 'approved' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user smuggled status change alongside unrelated edit';
    END IF;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.notes = 'hi' OR r.status = 'approved' THEN
        RAISE EXCEPTION 'TEST FAIL: rejected UPDATE partially applied';
    END IF;

    -- ── user: legitimate submission flow ────────────────────────────────────
    -- (row is still 'submitted' at this point from step 1's setup)
    IF r.status <> 'submitted' THEN
        RAISE EXCEPTION 'TEST SETUP FAIL: expected status submitted before admin review, got %', r.status;
    END IF;

    -- 5. user CAN edit unrelated columns (e.g. uploading another document)
    --    while their profile is pending review
    UPDATE public.kyc_profiles SET id_front_path = 'disposable/front.jpg' WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.id_front_path <> 'disposable/front.jpg' THEN
        RAISE EXCEPTION 'TEST FAIL: unrelated edit while submitted was blocked';
    END IF;

    -- ── admin: review path (is_admin() branch of the trigger) ──────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    -- 6. admin CAN decline (mirrors kyc-admin-decline's writes; note
    --    reviewed_by/reviewed_at are NOT reset to null on decline, same as
    --    properties.ownership_reviewed_by -- this is exactly the case a
    --    naive fixed-value WITH CHECK would have broken forever)
    UPDATE public.kyc_profiles
    SET status = 'declined', reviewed_by = v_admin, reviewed_at = now(), notes = 'test decline'
    WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.status <> 'declined' OR r.reviewed_by IS DISTINCT FROM v_admin THEN
        RAISE EXCEPTION 'TEST FAIL: admin decline was not applied';
    END IF;

    -- ── user: resubmission after decline (reviewed_by/reviewed_at now
    --    permanently non-null on the row until the user nulls them out
    --    themselves) ───────────────────────────────────────────────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

    -- 7. user CAN reset declined -> not_started, nulling reviewed_by/at
    --    themselves (mirrors useKyc.tsx's resubmit(), the "Try Again" button
    --    on VerifyId.tsx's declined screen). Before this migration, the old
    --    USING clause's status filter (not_started/submitted only) silently
    --    dropped this UPDATE with 0 rows affected and no error.
    UPDATE public.kyc_profiles
    SET status = 'not_started', id_doc_path = null, id_front_path = null, selfie_path = null,
        notes = null, reviewed_by = null, reviewed_at = null, submitted_at = null
    WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.status <> 'not_started' OR r.reviewed_by IS NOT NULL OR r.reviewed_at IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAIL: resubmit-after-decline reset was blocked or incomplete';
    END IF;

    -- 8. user CAN move not_started -> submitted again (re-submission)
    UPDATE public.kyc_profiles SET status = 'submitted', submitted_at = now() WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.status <> 'submitted' THEN
        RAISE EXCEPTION 'TEST FAIL: re-submission after reset was blocked';
    END IF;

    -- 9. user still cannot self-approve after a review history exists on the row
    BEGIN
        UPDATE public.kyc_profiles SET status = 'approved' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user self-approved after a review history existed';
    END IF;

    -- ── admin: direct declined -> submitted resubmission variant ───────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    UPDATE public.kyc_profiles
    SET status = 'declined', reviewed_by = v_admin, reviewed_at = now(), notes = 'second decline'
    WHERE user_id = v_user;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

    -- 10. user CAN resubmit declined -> submitted directly (without the
    --     intermediate not_started step), as long as reviewed_by/at are
    --     nulled out in the same statement
    UPDATE public.kyc_profiles
    SET status = 'submitted', reviewed_by = null, reviewed_at = null, notes = null, submitted_at = now()
    WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.status <> 'submitted' OR r.reviewed_by IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FAIL: direct declined -> submitted resubmission was blocked';
    END IF;

    -- ── admin: approve, then confirm the row is fully locked ───────────────
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

    -- 11. admin CAN approve (mirrors kyc-admin-approve's writes)
    UPDATE public.kyc_profiles
    SET status = 'approved', reviewed_by = v_admin, reviewed_at = now(), notes = null
    WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.status <> 'approved' THEN
        RAISE EXCEPTION 'TEST FAIL: admin approval was not applied';
    END IF;

    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);

    -- 12. user cannot modify ANY column on an approved profile, even an
    --     unrelated one -- there is no resubmission-after-approval flow
    BEGIN
        UPDATE public.kyc_profiles SET notes = 'trying to edit after approval' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user was able to edit an approved KYC profile';
    END IF;

    -- 13. user cannot reset an approved profile back to not_started either
    BEGIN
        UPDATE public.kyc_profiles SET status = 'not_started' WHERE user_id = v_user;
        v_errored := false;
    EXCEPTION WHEN OTHERS THEN
        v_errored := true;
    END;
    IF NOT v_errored THEN
        RAISE EXCEPTION 'TEST FAIL: user reset an approved KYC profile to not_started';
    END IF;

    -- ── service-role context (the edge functions write via the
    --    service-role key, i.e. no JWT / auth.uid() IS NULL) ───────────────
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);

    -- 14. service-role context CAN still modify an approved row (admin tooling)
    UPDATE public.kyc_profiles SET notes = 'service role edit' WHERE user_id = v_user;
    SELECT * INTO r FROM public.kyc_profiles WHERE user_id = v_user;
    IF r.notes <> 'service role edit' THEN
        RAISE EXCEPTION 'TEST FAIL: service-role edit on approved row was blocked';
    END IF;

    RAISE NOTICE 'kyc_profiles_rls.test.sql: all assertions passed';
END $$;

ROLLBACK;

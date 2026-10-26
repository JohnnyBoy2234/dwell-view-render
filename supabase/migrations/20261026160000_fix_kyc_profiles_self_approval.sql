-- Security fix: the pre-existing UPDATE policy "Users can update their own
-- KYC profile when not reviewed" had:
--   USING ((auth.uid() = user_id) AND (status = ANY (ARRAY['not_started','submitted'])))
--   WITH CHECK ((auth.uid() = user_id) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL))
-- This constrained reviewed_by/reviewed_at to stay null, but placed NO
-- constraint on status itself. Any user whose own row was still
-- 'not_started' or 'submitted' (i.e. not yet reviewed) could directly call
-- supabase.from('kyc_profiles').update({ status: 'approved' }).eq('user_id',
-- myOwnUserId) -- reviewed_by/reviewed_at stay null (satisfying WITH CHECK),
-- but status becomes 'approved' with zero admin review. The
-- enforce_publish_paywall() trigger on properties checks exactly
-- kyc_profiles.status = 'approved' for the IDENTITY_NOT_VERIFIED gate, so
-- this let any landlord bypass that half of the publish gate.
--
-- As with the analogous properties.ownership_status bug (see
-- 20261026150000_fix_properties_ownership_rls_bypass.sql), a fixed-value
-- WITH CHECK restricting status to a "safe" set does NOT work here either,
-- for the same root reason: WITH CHECK is evaluated against the entire new
-- row, not just the touched columns, and has no access to the OLD row to
-- express "unchanged". Confirmed live that both kyc-admin-approve and
-- kyc-admin-decline (supabase/functions/kyc-admin-approve/index.ts,
-- kyc-admin-decline/index.ts) set reviewed_by/reviewed_at on EVERY review
-- (approve OR decline) and never reset them to null -- so after a single
-- decline, reviewed_by/reviewed_at are permanently non-null, same as
-- properties.ownership_reviewed_by. The column-level guard is therefore
-- enforced with a BEFORE UPDATE trigger instead.
--
-- Separately, confirmed live (disposable rows, rolled back) that the OLD
-- USING clause's status filter already silently broke the one legitimate
-- post-decline flow: useKyc.tsx's resubmit() runs as the authenticated user
-- (not service role) and does
--   UPDATE kyc_profiles SET status = 'not_started', reviewed_by = NULL,
--     reviewed_at = NULL, ... WHERE user_id = auth.uid()
-- from the "Try Again" button on a declined profile (VerifyId.tsx). Because
-- the OLD row's status is 'declined' (not in {'not_started','submitted'}),
-- the old USING clause filtered the row out of the UPDATE entirely --
-- 0 rows affected, no error, a silent no-op. The new policy below (USING
-- only auth.uid() = user_id, no status filter) fixes this alongside the
-- security bug, and the trigger explicitly allows the self-null-out of
-- reviewed_by/reviewed_at as part of this exact transition.
--
-- The two kyc-admin-* edge functions write via the service-role key (no
-- user JWT, so auth.uid() IS NULL in that execution context) and are
-- unaffected by either change below.

DROP POLICY IF EXISTS "Users can update their own KYC profile when not reviewed" ON public.kyc_profiles;

CREATE POLICY "Users can update their own KYC profile"
ON public.kyc_profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Column-level guard: only an admin (or the service-role edge functions,
-- which run with auth.uid() IS NULL) may set reviewed_by/reviewed_at to a
-- non-null value, or move status to 'approved'/'declined'. A user may only
-- move their OWN row:
--   not_started -> submitted      (initial submission, useKyc.submitForReview)
--   declined    -> not_started    (reset before re-upload, useKyc.resubmit)
--   declined    -> submitted      (direct resubmission)
-- Once a profile is genuinely 'approved' it is permanently locked against
-- further self-edits: there is no resubmission-after-approval flow anywhere
-- in the product (VerifyId.tsx's 'approved' case renders only a "Continue to
-- Home Page" button, no upload/resubmit affordance), so there is nothing a
-- user should ever legitimately change on an approved row.
CREATE OR REPLACE FUNCTION public.protect_kyc_review_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'KYC_REVIEW_LOCKED: an approved KYC profile can only be modified by an admin';
  END IF;

  IF NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
    RAISE EXCEPTION 'KYC_REVIEW_LOCKED: only an admin can set reviewed_by or reviewed_at';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (
       (OLD.status = 'not_started' AND NEW.status = 'submitted')
       OR (OLD.status = 'declined' AND NEW.status IN ('not_started', 'submitted'))
     ) THEN
    RAISE EXCEPTION 'KYC_REVIEW_LOCKED: users may only submit (not_started -> submitted) or resubmit a declined profile (declined -> not_started/submitted)';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_kyc_review_columns ON public.kyc_profiles;
CREATE TRIGGER trg_protect_kyc_review_columns
BEFORE UPDATE ON public.kyc_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_kyc_review_columns();

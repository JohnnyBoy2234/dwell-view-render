-- Clarification follow-up to 20261026160000_fix_kyc_profiles_self_approval.sql
-- per code review: the original comment justified the full-lock-once-approved
-- behavior purely on UI-availability grounds ("no resubmission-after-approval
-- flow exists in the product"). That's true but incomplete, and could read as
-- "this lock could be relaxed later for some unrelated column, the way
-- properties.price stays editable after ownership is verified". It can't:
-- unlike properties.price, every remaining mutable column on kyc_profiles
-- (id_doc_path, id_front_path, id_back_path, selfie_path, notes) IS part of
-- what was reviewed -- there is no column here that's safely unrelated to
-- the review the way price/description are unrelated to
-- properties.ownership_status. This migration adds that reasoning directly
-- into the function body (not just a preceding script comment) so it shows
-- up in pg_get_functiondef() and travels with the function wherever it's
-- introspected. No logic change -- the function body below is byte-for-byte
-- identical except for the added comment.
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

  -- Once a profile is genuinely 'approved' it is permanently locked against
  -- ALL further self-edits, not just status/reviewed_by/reviewed_at. Unlike
  -- properties.price, every remaining mutable column on this table
  -- (id_doc_path, id_front_path, id_back_path, selfie_path, notes) is part
  -- of what was actually reviewed -- there is no column here that is safely
  -- unrelated to the review, the way price/description are unrelated to
  -- properties.ownership_status. So this isn't just "no UI flow needs it",
  -- it's "no column is safe to exempt": letting a user swap id_doc_path or
  -- selfie_path after approval while status stays 'approved' would bypass
  -- re-review entirely -- an even more severe variant of the exact bug this
  -- migration fixes.
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

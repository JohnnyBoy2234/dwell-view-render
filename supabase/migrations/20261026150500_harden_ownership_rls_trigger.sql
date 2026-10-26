-- Minor hardening of protect_ownership_review_columns() per code review of
-- 20261026150000_fix_properties_ownership_rls_bypass.sql:
--
-- 1. Guard on TG_OP so the function fails safe (no-op) instead of hard-erroring
--    on a dereference of OLD if this trigger is ever rebound to also fire on
--    INSERT (OLD doesn't exist for INSERT rows).
--
-- 2. This trigger coexists with trg_enforce_publish_paywall, which is also a
--    BEFORE UPDATE trigger on public.properties (fires only when is_listed is
--    in the update's target list). Postgres fires same-timing/same-event
--    triggers in alphabetical order by name, so trg_enforce_publish_paywall
--    ("e...") runs before trg_protect_ownership_review_columns ("p...").
--    Verified live: if a landlord's single UPDATE sets is_listed = true and
--    ownership_status = 'verified' together, whichever gate fails first wins
--    the surfaced error message (enforce_publish_paywall's identity/payment
--    checks, since by then NEW.ownership_status already reads 'verified' and
--    its own ownership check no longer fires; or this trigger's
--    OWNERSHIP_REVIEW_LOCKED, if identity/payment already happen to pass).
--    Either way the UPDATE is rejected, so the security guarantee holds
--    regardless of firing order -- only the error message varies.
CREATE OR REPLACE FUNCTION public.protect_ownership_review_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.ownership_verified_at IS DISTINCT FROM OLD.ownership_verified_at
     OR NEW.ownership_reviewed_by IS DISTINCT FROM OLD.ownership_reviewed_by THEN
    RAISE EXCEPTION 'OWNERSHIP_REVIEW_LOCKED: only an admin can set ownership_verified_at or ownership_reviewed_by';
  END IF;

  IF NEW.ownership_status IS DISTINCT FROM OLD.ownership_status
     AND NOT (OLD.ownership_status IN ('not_submitted', 'declined') AND NEW.ownership_status = 'submitted') THEN
    RAISE EXCEPTION 'OWNERSHIP_REVIEW_LOCKED: landlords may only move ownership_status to ''submitted''';
  END IF;

  RETURN NEW;
END;
$function$;

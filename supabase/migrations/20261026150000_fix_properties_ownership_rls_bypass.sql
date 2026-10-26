-- Security fix: the pre-existing single UPDATE policy on properties
-- ("Landlords can update their properties") had no WITH CHECK, so Postgres
-- defaulted it to the same expression as USING — meaning it only restricted
-- which ROWS a landlord could update (their own), not which COLUMNS/VALUES.
-- This let a landlord self-set ownership_status to 'verified' directly via
-- the public API (e.g. supabase.from('properties').update({ ownership_status:
-- 'verified', ... })), completely bypassing admin review and defeating the
-- entire purpose of this feature.
--
-- A plain RLS WITH CHECK that restricts ownership_status /
-- ownership_verified_at / ownership_reviewed_by to a fixed "safe" set of
-- values does NOT work here: WITH CHECK is evaluated against the entire new
-- row, not just the columns a given UPDATE actually touches. These columns
-- are permanently non-default (ownership_reviewed_by non-null,
-- ownership_status not in {not_submitted, submitted}) once a property has
-- been through even one admin review (approve OR decline) — so a
-- fixed-value WITH CHECK would silently lock landlords out of ALL future
-- edits (price, description, anything) on every reviewed property forever,
-- since every subsequent UPDATE's new row would still carry e.g. a
-- non-null ownership_reviewed_by and would always fail such a check. RLS
-- has no access to the OLD row to express "unchanged", so the column-level
-- guard below is enforced with a BEFORE UPDATE trigger instead, which does.
--
-- The two admin-*-property-ownership edge functions write via the
-- service-role key (no user JWT, so auth.uid() IS NULL in that execution
-- context) and are unaffected by either change below.

DROP POLICY IF EXISTS "Landlords can update their properties" ON public.properties;

CREATE POLICY "Landlords can update their own properties"
ON public.properties FOR UPDATE
USING (auth.uid() = landlord_id)
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Admins can update any property"
ON public.properties FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Column-level guard: only an admin (or the service-role edge functions,
-- which run with auth.uid() IS NULL) may change the review-controlled
-- columns. Landlords may only move ownership_status from 'not_submitted' or
-- 'declined' to 'submitted' (the real title-deed upload flow in
-- ListProperty.tsx's uploadTitleDeed) and may never change
-- ownership_verified_at or ownership_reviewed_by themselves.
CREATE OR REPLACE FUNCTION public.protect_ownership_review_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
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

DROP TRIGGER IF EXISTS trg_protect_ownership_review_columns ON public.properties;
CREATE TRIGGER trg_protect_ownership_review_columns
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.protect_ownership_review_columns();

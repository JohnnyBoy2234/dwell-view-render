-- Condition Report — Phase 2: structured per-item checklist (condition +
-- cleanliness + note + photos), meter readings, and keys/remotes issued.
-- All editable only while the record is `open`; frozen once sign-off starts.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) CHECKLIST ITEMS (per room, gradable)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  location_tag TEXT NOT NULL,
  name TEXT NOT NULL,
  condition TEXT CHECK (condition IN ('good', 'fair', 'poor', 'damaged')),
  cleanliness TEXT CHECK (cleanliness IN ('clean', 'needs_cleaning')),
  note TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_checklist_items_record ON public.condition_checklist_items(record_id);

-- Checklist-item photos reuse condition_photos, linked via item_id.
ALTER TABLE public.condition_photos
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.condition_checklist_items(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) METER READINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('electricity', 'water', 'gas', 'other')),
  reading TEXT NOT NULL,
  photo_path TEXT,
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_meters_record ON public.condition_meters(record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) KEYS / REMOTES ISSUED
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.condition_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.condition_records(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_condition_keys_record ON public.condition_keys(record_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) "OPEN ONLY" WRITE GUARD for the three tables
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.condition_child_open_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_state TEXT; v_rec UUID;
BEGIN
  v_rec := COALESCE(NEW.record_id, OLD.record_id);
  SELECT state INTO v_state FROM condition_records WHERE id = v_rec;
  IF v_state <> 'open' THEN
    RAISE EXCEPTION 'This record is no longer open for changes';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $fn$;

DROP TRIGGER IF EXISTS condition_checklist_items_guard ON public.condition_checklist_items;
CREATE TRIGGER condition_checklist_items_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.condition_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.condition_child_open_guard();

DROP TRIGGER IF EXISTS condition_meters_guard ON public.condition_meters;
CREATE TRIGGER condition_meters_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.condition_meters
FOR EACH ROW EXECUTE FUNCTION public.condition_child_open_guard();

DROP TRIGGER IF EXISTS condition_keys_guard ON public.condition_keys;
CREATE TRIGGER condition_keys_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.condition_keys
FOR EACH ROW EXECUTE FUNCTION public.condition_child_open_guard();

CREATE TRIGGER update_condition_checklist_items_updated_at
  BEFORE UPDATE ON public.condition_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RLS — parties may read always and write (subject to the open guard)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.condition_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_keys ENABLE ROW LEVEL SECURITY;

DO $do$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['condition_checklist_items', 'condition_meters', 'condition_keys'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Parties read %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "Parties read %1$s" ON public.%1$s FOR SELECT USING (public.is_condition_record_party(record_id));', t);
    EXECUTE format('DROP POLICY IF EXISTS "Parties write %1$s" ON public.%1$s;', t);
    EXECUTE format('CREATE POLICY "Parties write %1$s" ON public.%1$s FOR ALL USING (public.is_condition_record_party(record_id)) WITH CHECK (public.is_condition_record_party(record_id));', t);
  END LOOP;
END $do$;

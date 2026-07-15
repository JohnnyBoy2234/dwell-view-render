-- Condition Report — Phase 3: check-out comparison. A move-out checklist item
-- can classify how its condition changed from check-in. Unchanged items need no
-- classification ("As check-in"). Editable only while the record is open (the
-- existing condition_child_open_guard trigger already enforces this).

ALTER TABLE public.condition_checklist_items
  ADD COLUMN IF NOT EXISTS change_type TEXT
    CHECK (change_type IN ('fair_wear', 'tenant_damage', 'pre_existing')),
  ADD COLUMN IF NOT EXISTS change_note TEXT;

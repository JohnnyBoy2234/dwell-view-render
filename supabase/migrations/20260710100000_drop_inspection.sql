-- Inspection is replaced by Condition Records (ADR-0004, as amended 2026-07-10:
-- Inventory is KEPT as the furnished-property stock list). Clean drop of the
-- inspection tables only, no data migration — confirmed no production data
-- worth keeping. IF EXISTS because fresh local replay never creates them
-- (their creation migration was removed as a broken local-only record).

DROP TABLE IF EXISTS public.inspection_items CASCADE;
DROP TABLE IF EXISTS public.inspection_records CASCADE;

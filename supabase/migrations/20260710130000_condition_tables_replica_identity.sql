-- Realtime delivery fix: every realtime table in this project pairs its
-- supabase_realtime publication membership with REPLICA IDENTITY FULL
-- (messages/conversations/user_presence, kyc_capture_sessions, monthly_bills).
-- 20260709100000 added the condition tables to the publication but omitted
-- this, and hosted Realtime did not deliver their filtered postgres_changes
-- events to the other party (local's older realtime container tolerated it).
-- FULL is also required for filtered DELETE events (old row must be in WAL).
ALTER TABLE public.condition_records REPLICA IDENTITY FULL;
ALTER TABLE public.condition_photos REPLICA IDENTITY FULL;

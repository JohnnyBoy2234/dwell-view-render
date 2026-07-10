-- Add EXPERIAN_CREDIT_REPORT document type support.
-- Guarded: public.documents exists remotely but was created outside migrations
-- (remote history only tracks 20260707144339+), so fresh local replay lacks it.
-- The original dummy INSERT (fake row against user 0000...) is dropped — it
-- registered nothing and would violate the auth.users FK on replay anyway.
DO $$ BEGIN
IF to_regclass('public.documents') IS NOT NULL THEN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id);
  CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
END IF;
END $$;

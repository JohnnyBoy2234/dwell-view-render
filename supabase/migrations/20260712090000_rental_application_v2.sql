-- Rental application v2: server-side drafts, auditable credit-check consent,
-- versioned submission snapshots, structured reusable-profile fields.

-- 1. Server-side autosaved drafts (tenant-private; landlords never see drafts)
CREATE TABLE public.application_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  invite_id UUID,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_step INTEGER NOT NULL DEFAULT 0,
  completed_steps INTEGER[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, property_id)
);

ALTER TABLE public.application_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants manage their own application drafts"
ON public.application_drafts
FOR ALL
USING (auth.uid() = tenant_id)
WITH CHECK (auth.uid() = tenant_id);

CREATE TRIGGER update_application_drafts_updated_at
BEFORE UPDATE ON public.application_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Auditable credit-check consent, versioned wording snapshot per event
CREATE TABLE public.credit_check_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  consented BOOLEAN NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text_snapshot TEXT NOT NULL,
  privacy_policy_version TEXT,
  terms_version TEXT,
  user_agent TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_check_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants insert their own consent records"
ON public.credit_check_consents
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants view their own consent records"
ON public.credit_check_consents
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords view consent records for their applications"
ON public.credit_check_consents
FOR SELECT
USING (
  application_id IN (
    SELECT id FROM public.applications WHERE landlord_id = auth.uid()
  )
);

-- 3. Versioned, timestamped submission snapshot on the application itself
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot JSONB,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 4. Reusable tenant profile: structured identity / address / employment.
--    Flat legacy columns stay populated for the lease wizard and landlord views.
ALTER TABLE public.screening_details
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS gross_monthly_income NUMERIC,
  ADD COLUMN IF NOT EXISTS address JSONB,
  ADD COLUMN IF NOT EXISTS employment JSONB;

ALTER TABLE public.screening_profiles
  ADD COLUMN IF NOT EXISTS pets JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS household JSONB,
  ADD COLUMN IF NOT EXISTS risk_answers JSONB;

-- 5. documents table exists remotely but was created outside migrations
--    (remote history only tracks 20260707144339+); create it for local replay.
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  application_id UUID REFERENCES public.applications(id),
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users manage their own documents') THEN
    CREATE POLICY "Users manage their own documents"
    ON public.documents
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Landlords view documents of their applicants') THEN
    CREATE POLICY "Landlords view documents of their applicants"
    ON public.documents
    FOR SELECT
    USING (
      user_id IN (
        SELECT tenant_id FROM public.applications WHERE landlord_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 6. Landlords could already read applicants' income documents but not their
--    ID / proof-of-address uploads; mirror the income-documents policy.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Landlords can view id documents of their applicants') THEN
    CREATE POLICY "Landlords can view id documents of their applicants"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'id-documents' AND
      (storage.foldername(name))[1]::uuid IN (
        SELECT applications.tenant_id
        FROM applications
        WHERE applications.landlord_id = auth.uid()
      )
    );
  END IF;
END $$;

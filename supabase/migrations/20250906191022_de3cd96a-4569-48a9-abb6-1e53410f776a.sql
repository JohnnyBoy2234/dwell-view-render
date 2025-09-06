-- Create KYC status enum
CREATE TYPE kyc_status AS ENUM ('not_started', 'submitted', 'approved', 'declined');

-- Create main KYC profiles table
CREATE TABLE public.kyc_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status kyc_status NOT NULL DEFAULT 'not_started',
  id_doc_path TEXT,
  selfie_path TEXT,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit log table (immutable)
CREATE TABLE public.kyc_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX ON public.kyc_audit (user_id, created_at DESC);
CREATE INDEX ON public.kyc_profiles (status);

-- Enable RLS
ALTER TABLE public.kyc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_audit ENABLE ROW LEVEL SECURITY;

-- Create is_admin helper function
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
$$;

-- RLS Policies for kyc_profiles
CREATE POLICY "Users can view their own KYC profile"
  ON public.kyc_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC profiles"
  ON public.kyc_profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can insert their own KYC profile"
  ON public.kyc_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own KYC profile when not reviewed"
  ON public.kyc_profiles FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('not_started', 'submitted'))
  WITH CHECK (
    auth.uid() = user_id 
    AND reviewed_by IS NULL 
    AND reviewed_at IS NULL
  );

CREATE POLICY "Admins can update any KYC profile"
  ON public.kyc_profiles FOR UPDATE
  USING (is_admin());

-- RLS Policies for kyc_audit
CREATE POLICY "Users can view their own audit logs"
  ON public.kyc_audit FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.kyc_audit FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role can insert audit logs"
  ON public.kyc_audit FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for KYC uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-uploads', 'kyc-uploads', false);

-- Storage policies
CREATE POLICY "Users can upload their own KYC documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all KYC documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-uploads' AND
    is_admin()
  );

CREATE POLICY "Service role can delete KYC documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'kyc-uploads');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_kyc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kyc_profiles_updated_at
  BEFORE UPDATE ON public.kyc_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_kyc_updated_at();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION public.create_kyc_audit_log(
  _user_id UUID,
  _action TEXT,
  _actor UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.kyc_audit (user_id, action, actor, metadata)
  VALUES (_user_id, _action, _actor, _metadata);
END;
$$;
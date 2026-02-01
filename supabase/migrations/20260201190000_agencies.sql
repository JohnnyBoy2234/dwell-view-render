-- Agency onboarding + agent sub-accounts

-- Status enum for agencies
DO $$ BEGIN
  CREATE TYPE public.agency_status AS ENUM ('draft', 'submitted', 'approved', 'declined');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Main agencies table
CREATE TABLE IF NOT EXISTS public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status public.agency_status NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decline_reason text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Membership table
CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('agency_admin', 'agent')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (agency_id, user_id)
);

-- Agent profile info shown on listings
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  mobile text,
  email text,
  license_number text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agency uploaded documents
CREATE TABLE IF NOT EXISTS public.agency_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);
CREATE INDEX IF NOT EXISTS idx_agencies_created_by ON public.agencies(created_by);
CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_documents_agency_id ON public.agency_documents(agency_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_agency_id ON public.agent_profiles(agency_id);

-- Helper: is agency admin for a given agency
CREATE OR REPLACE FUNCTION public.is_agency_admin(_agency_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members m
    WHERE m.agency_id = _agency_id
      AND m.user_id = _user_id
      AND m.role = 'agency_admin'
  );
$$;

-- Enable RLS
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_documents ENABLE ROW LEVEL SECURITY;

-- Agencies policies
CREATE POLICY "Agency admins can view their agency"
  ON public.agencies FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.agency_members m
      WHERE m.agency_id = agencies.id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agencies"
  ON public.agencies FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Agency admins can update their agency"
  ON public.agencies FOR UPDATE
  USING (public.is_admin() OR public.is_agency_admin(agencies.id))
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agencies.id));

-- Agency members policies
CREATE POLICY "Agency members can view agency membership"
  ON public.agency_members FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.agency_members m
      WHERE m.agency_id = agency_members.agency_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency creator can create initial admin membership"
  ON public.agency_members FOR INSERT
  WITH CHECK (
    agency_members.user_id = auth.uid()
    AND agency_members.role = 'agency_admin'
    AND EXISTS (
      SELECT 1
      FROM public.agencies a
      WHERE a.id = agency_members.agency_id
        AND a.created_by = auth.uid()
    )
  );

CREATE POLICY "Only agency admins can manage members"
  ON public.agency_members FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agency_members.agency_id));

CREATE POLICY "Only agency admins can update members"
  ON public.agency_members FOR UPDATE
  USING (public.is_admin() OR public.is_agency_admin(agency_members.agency_id))
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agency_members.agency_id));

CREATE POLICY "Only agency admins can delete members"
  ON public.agency_members FOR DELETE
  USING (public.is_admin() OR public.is_agency_admin(agency_members.agency_id));

-- Agent profiles policies
CREATE POLICY "Agent profiles are viewable to authenticated users"
  ON public.agent_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agency admins can manage agent profiles"
  ON public.agent_profiles FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agent_profiles.agency_id));

CREATE POLICY "Agency admins can update agent profiles"
  ON public.agent_profiles FOR UPDATE
  USING (public.is_admin() OR public.is_agency_admin(agent_profiles.agency_id))
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agent_profiles.agency_id));

-- Agency documents policies
CREATE POLICY "Agency members can view agency documents"
  ON public.agency_documents FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.agency_members m
      WHERE m.agency_id = agency_documents.agency_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Agency admins can add agency documents"
  ON public.agency_documents FOR INSERT
  WITH CHECK (public.is_admin() OR public.is_agency_admin(agency_documents.agency_id));

CREATE POLICY "Agency admins can delete agency documents"
  ON public.agency_documents FOR DELETE
  USING (public.is_admin() OR public.is_agency_admin(agency_documents.agency_id));

-- Storage bucket for agency uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-uploads', 'agency-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for agency uploads
-- Path convention: agency/<agency_id>/<filename>
CREATE POLICY "Agency admins can upload agency documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-uploads'
    AND (public.is_admin() OR public.is_agency_admin(((storage.foldername(name))[2])::uuid))
  );

CREATE POLICY "Agency members can view agency documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'agency-uploads'
    AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1
        FROM public.agency_members m
        WHERE m.agency_id = ((storage.foldername(name))[2])::uuid
          AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can delete agency documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agency-uploads');

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.update_agencies_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agencies_updated_at ON public.agencies;
CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agencies_updated_at();

CREATE OR REPLACE FUNCTION public.update_agent_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER update_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_profiles_updated_at();

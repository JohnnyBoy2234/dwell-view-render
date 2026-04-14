-- 1. Add is_listed to properties (default true so all existing properties stay visible)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- 2. Add listing_type to properties (already used in app code but missing from DB)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_type text;

-- 3. Add id_number to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS id_number text;

-- 4. Create property_invites table
CREATE TABLE IF NOT EXISTS property_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 20),
  monthly_rent numeric NOT NULL,
  lease_start date NOT NULL,
  lease_end date,
  used_at timestamptz,
  tenant_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. RLS for property_invites
ALTER TABLE property_invites ENABLE ROW LEVEL SECURITY;

-- Landlord can manage their own invites
CREATE POLICY "landlord_manage_invites" ON property_invites
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Anyone can read unused invites by token (for unauthenticated join page)
-- Used invites are only visible to the landlord or linked tenant
CREATE POLICY "public_read_invite_by_token" ON property_invites
  FOR SELECT TO anon, authenticated
  USING (
    used_at IS NULL
    OR landlord_id = auth.uid()
    OR tenant_id = auth.uid()
  );

-- Tenant can update used_at + tenant_id when accepting
CREATE POLICY "tenant_accept_invite" ON property_invites
  FOR UPDATE TO authenticated
  USING (used_at IS NULL)
  WITH CHECK (tenant_id = auth.uid());

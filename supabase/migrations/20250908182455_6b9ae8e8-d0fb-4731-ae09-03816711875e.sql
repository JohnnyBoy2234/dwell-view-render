-- Create events table for telemetry
CREATE TABLE IF NOT EXISTS public.events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  properties jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX events_user_id_created_at_idx ON public.events (user_id, created_at DESC);
CREATE INDEX events_name_created_at_idx ON public.events (name, created_at DESC);

-- Helper view for email and KYC gate status
CREATE OR REPLACE VIEW public.user_kyc_gate AS
SELECT
  u.id AS user_id,
  u.email,
  (u.email_confirmed_at IS NOT NULL) AS email_verified,
  COALESCE(k.status, 'not_started') AS kyc_status,
  (u.email_confirmed_at IS NOT NULL AND COALESCE(k.status, 'not_started') = 'approved') AS can_request_viewing
FROM auth.users u
LEFT JOIN public.kyc_profiles k ON k.user_id = u.id;

-- Enable RLS on events table
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events table policies
CREATE POLICY "Users can view their own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.events FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert events"
  ON public.events FOR INSERT
  WITH CHECK (true);

-- Helper function to log events
CREATE OR REPLACE FUNCTION public.log_event(
  _user_id uuid,
  _name text,
  _properties jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.events (user_id, name, properties)
  VALUES (_user_id, _name, _properties);
END;
$$;
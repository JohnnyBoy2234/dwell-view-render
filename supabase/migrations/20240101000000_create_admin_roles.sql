-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Add comments
COMMENT ON TABLE public.user_roles IS 'User roles for access control';
COMMENT ON COLUMN public.user_roles.user_id IS 'References the auth.users table';
COMMENT ON COLUMN public.user_roles.role IS 'Role name (e.g., admin, manager)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Enable read access for authenticated users" 
ON public.user_roles 
FOR SELECT 
TO authenticated 
USING (true);

-- Only service role can insert/update/delete (handled by edge function with service role)
CREATE POLICY "Enable all access for service role" 
ON public.user_roles 
USING (auth.role() = 'service_role');

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(user_id_param UUID, role_param TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = user_id_param AND role::text = role_param::text
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(role_param TEXT)
RETURNS BOOLEAN AS $$
  SELECT has_role(auth.uid(), role_param);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Fix the security issue with the promote_to_landlord function by setting search_path
CREATE OR REPLACE FUNCTION public.promote_to_landlord()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert landlord role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'landlord'::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
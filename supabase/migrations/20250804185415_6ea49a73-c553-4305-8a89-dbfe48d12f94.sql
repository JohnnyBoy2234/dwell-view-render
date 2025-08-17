-- Check if trigger exists and create it if it doesn't
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also, let's make the properties INSERT policy more flexible
-- by allowing users to create properties if they have explicit landlord role
-- or if they're creating with their own user ID (for initial landlord creation)
DROP POLICY IF EXISTS "Landlords can create properties" ON public.properties;

CREATE POLICY "Landlords can create properties" 
ON public.properties 
FOR INSERT 
WITH CHECK (
  (auth.uid() = landlord_id) AND 
  (has_role(auth.uid(), 'landlord'::user_role) OR 
   -- Allow if user doesn't have any role yet (first-time landlord)
   NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()))
);

-- Let's also create a function to promote a user to landlord role
CREATE OR REPLACE FUNCTION public.promote_to_landlord()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert landlord role if it doesn't exist
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'landlord'::user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
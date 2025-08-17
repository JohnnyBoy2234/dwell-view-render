-- Create edge function for admin user creation
CREATE OR REPLACE FUNCTION public.create_admin_account(
  email_param text,
  display_name_param text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Only admins can create admin accounts';
  END IF;

  -- For demo purposes, we'll create a placeholder user record
  -- In production, this would integrate with Supabase Auth Admin API
  user_id := gen_random_uuid();
  
  -- Create profile entry
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (user_id, display_name_param);
  
  -- Add admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_id, 'admin'::user_role);
  
  result := json_build_object(
    'success', true,
    'user_id', user_id,
    'message', 'Admin account created successfully'
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
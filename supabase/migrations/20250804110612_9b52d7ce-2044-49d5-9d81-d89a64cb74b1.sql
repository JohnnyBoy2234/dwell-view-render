-- Update the handle_new_user function to support Google OAuth role parameter
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)));
  
  -- Check for role in multiple places: explicit role metadata, query params, or default to tenant
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      CASE 
        WHEN NEW.raw_user_meta_data ->> 'provider' = 'google' THEN 'tenant'::user_role
        ELSE 'tenant'::user_role
      END
    )
  );
  
  RETURN NEW;
END;
$function$;
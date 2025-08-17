-- Update existing profiles with full names from auth.users metadata
UPDATE public.profiles 
SET display_name = COALESCE(
  auth.users.raw_user_meta_data ->> 'full_name',
  auth.users.raw_user_meta_data ->> 'name',
  profiles.display_name
)
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND (
  auth.users.raw_user_meta_data ->> 'full_name' IS NOT NULL 
  OR auth.users.raw_user_meta_data ->> 'name' IS NOT NULL
);
-- Delete user calebcoding123@gmail.com and all associated data
-- This will cascade delete due to foreign key constraints

DELETE FROM auth.users 
WHERE email = 'calebcoding123@gmail.com' 
AND id = 'dcef8568-4224-46bf-b8b0-ed5d1c42c2ff';
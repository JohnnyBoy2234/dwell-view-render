-- Add foreign key relationship to profiles.
-- Drop-first added: 20241220's inline REFERENCES already created this
-- constraint under the same name, breaking fresh local replay.
ALTER TABLE public.support_messages
DROP CONSTRAINT IF EXISTS support_messages_user_id_fkey;
ALTER TABLE public.support_messages
ADD CONSTRAINT support_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

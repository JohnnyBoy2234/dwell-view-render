-- Create support_messages table.
-- IF NOT EXISTS added: 20241220 already creates a superset of this table
-- (extra admin_response columns the app reads), which broke fresh local
-- `supabase db reset` replay. This file's policies/trigger still win below.
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own support messages" ON public.support_messages; -- dedup for local replay
CREATE POLICY "Users can view their own support messages" 
ON public.support_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own support messages" ON public.support_messages; -- dedup for local replay
CREATE POLICY "Users can update their own support messages" 
ON public.support_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages; -- dedup for local replay
CREATE POLICY "Admins can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

DROP POLICY IF EXISTS "Admins can update all support messages" ON public.support_messages; -- dedup for local replay
CREATE POLICY "Admins can update all support messages" 
ON public.support_messages 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updating updated_at (drop 20241220's version first; dedup for local replay)
DROP TRIGGER IF EXISTS update_support_messages_updated_at ON public.support_messages;
CREATE TRIGGER update_support_messages_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
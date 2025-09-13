-- Create support_messages table
CREATE TABLE public.support_messages (
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
CREATE POLICY "Users can view their own support messages" 
ON public.support_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own support messages" 
ON public.support_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support messages" 
ON public.support_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update all support messages" 
ON public.support_messages 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updating updated_at
CREATE TRIGGER update_support_messages_updated_at
BEFORE UPDATE ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
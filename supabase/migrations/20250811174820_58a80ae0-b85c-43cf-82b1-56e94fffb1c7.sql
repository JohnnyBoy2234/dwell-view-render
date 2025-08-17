-- Add email verification column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

-- Create email verification tokens table
CREATE TABLE public.email_verification_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  used_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for email verification tokens
CREATE POLICY "Users can view their own verification tokens" 
ON public.email_verification_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage verification tokens" 
ON public.email_verification_tokens 
FOR ALL 
USING (true);

-- Create index for performance
CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens(user_id);
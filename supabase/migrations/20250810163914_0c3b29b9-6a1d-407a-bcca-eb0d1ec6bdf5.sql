-- Create table for email verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Reference auth.users; on delete cascade to clean up
ALTER TABLE public.verification_codes
  ADD CONSTRAINT verification_codes_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_created_at
  ON public.verification_codes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at
  ON public.verification_codes (expires_at);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS policies: users may manage only their own codes
CREATE POLICY IF NOT EXISTS "Users can insert their own verification codes"
ON public.verification_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own verification codes"
ON public.verification_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view their own verification codes"
ON public.verification_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own verification codes"
ON public.verification_codes
FOR DELETE
USING (auth.uid() = user_id);

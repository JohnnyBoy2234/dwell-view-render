-- Create verification_codes table for OTP login
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_verification_codes_user
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (user_id)
    ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_created ON public.verification_codes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.verification_codes (expires_at);

-- Enable Row Level Security; access will be via service role only
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Do not add permissive RLS policies; service role bypasses RLS.
-- Optional: Cleanup policy can be handled via a scheduled job externally if desired.
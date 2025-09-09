-- Create table for KYC capture sessions to link desktop and phone
CREATE TABLE IF NOT EXISTS public.kyc_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desktop_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('id_front', 'id_back', 'selfie')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'expired')),
  file_path TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS kyc_capture_sessions_desktop_idx ON public.kyc_capture_sessions (desktop_user_id, status);
CREATE INDEX IF NOT EXISTS kyc_capture_sessions_expires_idx ON public.kyc_capture_sessions (expires_at);

-- Enable RLS
ALTER TABLE public.kyc_capture_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own capture sessions" 
ON public.kyc_capture_sessions 
FOR SELECT 
USING (auth.uid() = desktop_user_id);

CREATE POLICY "Users can create their own capture sessions" 
ON public.kyc_capture_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = desktop_user_id);

CREATE POLICY "System can update capture sessions" 
ON public.kyc_capture_sessions 
FOR UPDATE 
USING (true);

-- Add realtime support
ALTER TABLE public.kyc_capture_sessions REPLICA IDENTITY FULL;
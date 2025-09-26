-- Fix KYC status for user who has documents but wrong status
-- Update hannahdowie11's KYC profile to correct status
UPDATE public.kyc_profiles 
SET 
  status = 'submitted',
  submitted_at = COALESCE(submitted_at, created_at, now()),
  updated_at = now()
WHERE user_id IN (
  SELECT user_id 
  FROM auth.users 
  WHERE email = 'hannahdowie11@gmail.com'
) 
AND status = 'not_started' 
AND (id_front_path IS NOT NULL OR id_back_path IS NOT NULL OR selfie_path IS NOT NULL);
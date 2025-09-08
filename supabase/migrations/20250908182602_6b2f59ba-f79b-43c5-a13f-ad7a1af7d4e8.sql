-- Drop the problematic view that exposes auth.users
DROP VIEW IF EXISTS public.user_kyc_gate;

-- Create a secure function to check user gate status instead
CREATE OR REPLACE FUNCTION public.check_user_gate_status(_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email_verified boolean,
  kyc_status text,
  can_request_viewing boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    _user_id,
    (
      SELECT u.email_confirmed_at IS NOT NULL 
      FROM auth.users u 
      WHERE u.id = _user_id
    ) AS email_verified,
    COALESCE(k.status::text, 'not_started') AS kyc_status,
    (
      (SELECT u.email_confirmed_at IS NOT NULL FROM auth.users u WHERE u.id = _user_id) 
      AND 
      COALESCE(k.status, 'not_started') = 'approved'
    ) AS can_request_viewing
  FROM (SELECT _user_id AS id) AS base_user
  LEFT JOIN public.kyc_profiles k ON k.user_id = _user_id;
END;
$$;

-- Grant execution to authenticated users only
GRANT EXECUTE ON FUNCTION public.check_user_gate_status TO authenticated;
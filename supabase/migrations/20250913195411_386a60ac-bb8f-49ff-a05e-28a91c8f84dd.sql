-- Create helper function to update lease agreement status
CREATE OR REPLACE FUNCTION public.update_lease_status(
  p_lease_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lease_agreements 
  SET status = p_status, updated_at = NOW()
  WHERE id = p_lease_id
  AND (landlord_id = auth.uid() OR tenant_id = auth.uid());
  
  RETURN FOUND;
END;
$$;
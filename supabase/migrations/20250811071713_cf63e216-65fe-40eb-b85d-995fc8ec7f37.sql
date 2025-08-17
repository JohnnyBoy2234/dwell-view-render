-- Fix security warning by setting proper search_path for the function
CREATE OR REPLACE FUNCTION public.validate_application_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if tenant has access to apply for this property
  IF NOT can_access_application(NEW.property_id, NEW.tenant_id) THEN
    RAISE EXCEPTION 'Application not available - viewing must be confirmed and application sent by landlord';
  END IF;
  
  RETURN NEW;
END;
$$;
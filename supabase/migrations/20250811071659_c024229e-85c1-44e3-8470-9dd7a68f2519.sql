-- Add viewing confirmation and application sent flags to viewings table
ALTER TABLE public.viewings 
ADD COLUMN viewing_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN application_sent BOOLEAN DEFAULT FALSE;

-- Add function to check if tenant can access application
CREATE OR REPLACE FUNCTION public.can_access_application(
  property_uuid UUID,
  tenant_uuid UUID
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.viewings
    WHERE property_id = property_uuid
      AND tenant_id = tenant_uuid
      AND viewing_confirmed = TRUE
      AND application_sent = TRUE
  );
$$;

-- Update applications table to enforce viewing workflow
-- Add constraint function for applications
CREATE OR REPLACE FUNCTION public.validate_application_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if tenant has access to apply for this property
  IF NOT can_access_application(NEW.property_id, NEW.tenant_id) THEN
    RAISE EXCEPTION 'Application not available - viewing must be confirmed and application sent by landlord';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate application access
DROP TRIGGER IF EXISTS validate_application_access_trigger ON public.applications;
CREATE TRIGGER validate_application_access_trigger
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_application_access();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_viewings_property_tenant_flags 
ON public.viewings(property_id, tenant_id, viewing_confirmed, application_sent);
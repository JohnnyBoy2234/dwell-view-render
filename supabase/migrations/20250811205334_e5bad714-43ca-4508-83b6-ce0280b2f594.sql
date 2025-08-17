-- Add unique constraint to prevent duplicate applications
ALTER TABLE public.applications 
ADD CONSTRAINT unique_tenant_property_application 
UNIQUE (tenant_id, property_id);

-- Update application status values to be more comprehensive
-- We'll use: pending, pending_credit_check, accepted, declined
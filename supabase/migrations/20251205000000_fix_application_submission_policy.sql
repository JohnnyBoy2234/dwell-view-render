-- Fix application submission policy to allow tenants to submit applications
-- Remove the restrictive trigger that requires viewing confirmation

-- Drop the trigger that validates application access
DROP TRIGGER IF EXISTS validate_application_access_trigger ON public.applications;

-- Optionally, we can modify the function to be more permissive
-- For now, we'll just remove the trigger to allow all tenant submissions
-- The RLS policies on the applications table already ensure tenants can only create their own applications

-- Note: The can_access_application function is kept for potential future use
-- but the trigger is removed to allow flexible application submission

-- Fix application_requests RLS: Add INSERT policy for tenants
-- Currently tenants can only SELECT, but they need to INSERT to create requests
CREATE POLICY "Enable insert access for tenants" 
ON public.application_requests 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = tenant_id);


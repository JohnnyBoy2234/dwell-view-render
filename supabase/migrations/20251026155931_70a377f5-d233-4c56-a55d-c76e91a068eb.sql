-- Add INSERT policy for tenants to create application requests
CREATE POLICY "Tenants can create application requests"
ON application_requests
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);
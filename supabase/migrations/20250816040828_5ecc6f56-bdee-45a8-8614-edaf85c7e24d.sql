-- Fix security issue: Simplify and strengthen RLS policies for inquiries table
-- to prevent unauthorized access to personal information (email, phone)

-- First, drop the existing problematic policy
DROP POLICY IF EXISTS "Restricted inquiry viewing" ON public.inquiries;

-- Create more secure and explicit policies for viewing inquiries

-- Policy 1: Property owners can view inquiries for their properties
CREATE POLICY "Property owners can view inquiries for their properties" 
ON public.inquiries 
FOR SELECT 
TO authenticated
USING (
  property_id IN (
    SELECT id 
    FROM public.properties 
    WHERE landlord_id = auth.uid()
  )
);

-- Policy 2: Authenticated tenants can only view their own inquiries
CREATE POLICY "Tenants can view their own inquiries" 
ON public.inquiries 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = tenant_id AND tenant_id IS NOT NULL
);

-- Policy 3: Admins can view all inquiries
CREATE POLICY "Admins can view all inquiries" 
ON public.inquiries 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role)
);

-- Update the INSERT policy to be more explicit about tenant_id handling
DROP POLICY IF EXISTS "Authenticated users and anonymous can create inquiries" ON public.inquiries;

-- Create separate policies for authenticated and anonymous users
CREATE POLICY "Authenticated users can create inquiries with their user_id" 
ON public.inquiries 
FOR INSERT 
TO authenticated
WITH CHECK (
  (tenant_id = auth.uid()) OR (tenant_id IS NULL)
);

CREATE POLICY "Anonymous users can create inquiries" 
ON public.inquiries 
FOR INSERT 
TO anon
WITH CHECK (
  tenant_id IS NULL
);
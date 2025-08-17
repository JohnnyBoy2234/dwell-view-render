-- Fix security issue with inquiries table RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Property owners can view inquiries for their properties" ON public.inquiries;
DROP POLICY IF EXISTS "Property owners can update inquiries for their properties" ON public.inquiries;

-- Create more secure policies

-- 1. Restrict inquiry creation to authenticated users or allow anonymous with proper validation
CREATE POLICY "Authenticated users and anonymous can create inquiries"
ON public.inquiries
FOR INSERT
WITH CHECK (
  -- Allow authenticated users to create inquiries for themselves
  (auth.uid() IS NOT NULL AND (tenant_id = auth.uid() OR tenant_id IS NULL))
  OR
  -- Allow anonymous inquiries but ensure tenant_id is NULL for anonymous users
  (auth.uid() IS NULL AND tenant_id IS NULL)
);

-- 2. Restrict viewing to property owners, inquiry creators, and admins only
CREATE POLICY "Restricted inquiry viewing"
ON public.inquiries
FOR SELECT
USING (
  -- Property owners can view inquiries for their properties
  (auth.uid() IN (
    SELECT properties.landlord_id 
    FROM properties 
    WHERE properties.id = inquiries.property_id
  ))
  OR
  -- Authenticated users can view their own inquiries
  (auth.uid() IS NOT NULL AND auth.uid() = tenant_id)
  OR
  -- Admins can view all inquiries
  has_role(auth.uid(), 'admin'::user_role)
);

-- 3. Restrict updates to property owners and admins only
CREATE POLICY "Property owners and admins can update inquiries"
ON public.inquiries
FOR UPDATE
USING (
  -- Property owners can update inquiries for their properties
  (auth.uid() IN (
    SELECT properties.landlord_id 
    FROM properties 
    WHERE properties.id = inquiries.property_id
  ))
  OR
  -- Admins can update any inquiry
  has_role(auth.uid(), 'admin'::user_role)
)
WITH CHECK (
  -- Same conditions for the updated row
  (auth.uid() IN (
    SELECT properties.landlord_id 
    FROM properties 
    WHERE properties.id = inquiries.property_id
  ))
  OR
  has_role(auth.uid(), 'admin'::user_role)
);

-- 4. Prevent deletion by default (no DELETE policy = no one can delete)
-- If deletion is needed later, we can add a restrictive policy
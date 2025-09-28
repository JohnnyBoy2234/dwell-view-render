-- Add RLS policy to allow admins to delete properties
CREATE POLICY "Admins can delete any property" 
ON public.properties 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::user_role));
-- Create viewings table to track property viewings
CREATE TABLE public.viewings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  conversation_id UUID,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'requested'::text,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.viewings ENABLE ROW LEVEL SECURITY;

-- Create policies for viewings
CREATE POLICY "Landlords can view their property viewings" 
ON public.viewings 
FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can view their own viewings" 
ON public.viewings 
FOR SELECT 
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can create viewings for their properties" 
ON public.viewings 
FOR INSERT 
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Landlords can update their property viewings" 
ON public.viewings 
FOR UPDATE 
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can update viewing details" 
ON public.viewings 
FOR UPDATE 
USING (auth.uid() = tenant_id);

-- Add viewing_id to applications table to link applications to completed viewings
ALTER TABLE public.applications ADD COLUMN viewing_id UUID;

-- Create policy to ensure applications can only be created after viewing completion
CREATE OR REPLACE FUNCTION public.can_create_application(viewing_uuid UUID, landlord_uuid UUID, tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.viewings
    WHERE id = viewing_uuid
      AND landlord_id = landlord_uuid
      AND tenant_id = tenant_uuid
      AND status = 'completed'
      AND completed_at IS NOT NULL
  )
$$;

-- Update applications insert policy to require completed viewing
DROP POLICY IF EXISTS "Tenants can create applications" ON public.applications;

CREATE POLICY "Tenants can create applications after viewing completion" 
ON public.applications 
FOR INSERT 
WITH CHECK (
  auth.uid() = tenant_id 
  AND (
    viewing_id IS NULL 
    OR public.can_create_application(viewing_id, landlord_id, tenant_id)
  )
);

-- Add trigger for automatic timestamp updates on viewings
CREATE TRIGGER update_viewings_updated_at
BEFORE UPDATE ON public.viewings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
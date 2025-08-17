-- Create screening_details table to store tenant screening information
CREATE TABLE public.screening_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  phone TEXT NOT NULL,
  employment_status TEXT NOT NULL,
  job_title TEXT,
  company_name TEXT,
  net_monthly_income NUMERIC,
  current_address TEXT,
  reason_for_moving TEXT,
  previous_landlord_name TEXT,
  previous_landlord_contact TEXT,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create applications table to track formal applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  property_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add is_tenant_screened column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_tenant_screened BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.screening_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- RLS policies for screening_details
CREATE POLICY "Users can manage their own screening details" 
ON public.screening_details 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for applications
CREATE POLICY "Tenants can view their own applications" 
ON public.applications 
FOR SELECT 
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view applications for their properties" 
ON public.applications 
FOR SELECT 
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can create applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Landlords can update applications for their properties" 
ON public.applications 
FOR UPDATE 
USING (auth.uid() = landlord_id);

-- Add trigger for updated_at columns
CREATE TRIGGER update_screening_details_updated_at
BEFORE UPDATE ON public.screening_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
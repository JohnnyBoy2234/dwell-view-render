-- Create property reports table
CREATE TABLE public.property_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  reporter_id UUID,
  reporter_email TEXT,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can create reports" 
ON public.property_reports 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = reporter_id) OR 
  (auth.uid() IS NULL AND reporter_email IS NOT NULL)
);

CREATE POLICY "Admins can view all reports" 
ON public.property_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can update reports" 
ON public.property_reports 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger for updating updated_at
CREATE TRIGGER update_property_reports_updated_at
BEFORE UPDATE ON public.property_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
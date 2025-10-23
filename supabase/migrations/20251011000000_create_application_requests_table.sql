-- Create application_requests table
CREATE TABLE IF NOT EXISTS public.application_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, tenant_id) -- Prevent duplicate requests for same property
);

-- Enable RLS
ALTER TABLE public.application_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_application_requests_property_id ON public.application_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_application_requests_tenant_id ON public.application_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_application_requests_landlord_id ON public.application_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_application_requests_status ON public.application_requests(status);

-- RLS Policies
CREATE POLICY "Enable read access for tenant" 
ON public.application_requests 
FOR SELECT 
TO authenticated
USING (auth.uid() = tenant_id);

CREATE POLICY "Enable all access for landlord" 
ON public.application_requests 
FOR ALL 
TO authenticated
USING (auth.uid() = landlord_id)
WITH CHECK (auth.uid() = landlord_id);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_application_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_application_request_updated_at
BEFORE UPDATE ON public.application_requests
FOR EACH ROW
EXECUTE FUNCTION update_application_request_updated_at();

-- Function to notify tenant when status changes
CREATE OR REPLACE FUNCTION notify_application_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      reference_id,
      reference_type
    ) VALUES (
      NEW.tenant_id,
      'Application Request ' || NEW.status,
      'Your application request for property has been ' || NEW.status || '.',
      'application_request_' || NEW.status,
      NEW.id,
      'application_request'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status change notifications
CREATE TRIGGER trigger_application_request_status_change
AFTER UPDATE OF status ON public.application_requests
FOR EACH ROW
WHEN (NEW.status != OLD.status)
EXECUTE FUNCTION notify_application_request_status_change();

-- Create maintenance_messages table for maintenance request messaging
CREATE TABLE public.maintenance_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant', 'landlord')),
  recipient_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.maintenance_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance messages
CREATE POLICY "Tenants can view messages for their maintenance requests"
  ON public.maintenance_messages
  FOR SELECT
  USING (
    maintenance_request_id IN (
      SELECT id FROM public.maintenance_requests 
      WHERE tenant_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can view messages for their maintenance requests"
  ON public.maintenance_messages
  FOR SELECT
  USING (
    maintenance_request_id IN (
      SELECT id FROM public.maintenance_requests 
      WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can send messages for their maintenance requests"
  ON public.maintenance_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_user_id AND
    sender_role = 'tenant' AND
    maintenance_request_id IN (
      SELECT id FROM public.maintenance_requests 
      WHERE tenant_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can send messages for their maintenance requests"
  ON public.maintenance_messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_user_id AND
    sender_role = 'landlord' AND
    maintenance_request_id IN (
      SELECT id FROM public.maintenance_requests 
      WHERE landlord_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark their received messages as read"
  ON public.maintenance_messages
  FOR UPDATE
  USING (auth.uid() = recipient_user_id)
  WITH CHECK (auth.uid() = recipient_user_id);

-- Create updated_at trigger
CREATE TRIGGER update_maintenance_messages_updated_at
  BEFORE UPDATE ON public.maintenance_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_maintenance_messages_request_id ON public.maintenance_messages(maintenance_request_id);
CREATE INDEX idx_maintenance_messages_created_at ON public.maintenance_messages(created_at);
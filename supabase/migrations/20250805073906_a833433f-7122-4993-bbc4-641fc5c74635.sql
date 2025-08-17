-- Add only the missing lease fields to tenancies table
ALTER TABLE public.tenancies 
ADD COLUMN IF NOT EXISTS lease_status text DEFAULT 'draft' CHECK (lease_status IN ('draft', 'generated', 'landlord_signed', 'tenant_signed', 'completed')),
ADD COLUMN IF NOT EXISTS landlord_signature_url text,
ADD COLUMN IF NOT EXISTS tenant_signature_url text,
ADD COLUMN IF NOT EXISTS landlord_signed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS tenant_signed_at timestamp with time zone;

-- Create lease_templates table for customizable lease templates
CREATE TABLE IF NOT EXISTS public.lease_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id uuid NOT NULL,
  name text NOT NULL,
  template_content jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on lease_templates
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for lease_templates
CREATE POLICY "Landlords can manage their lease templates" 
ON public.lease_templates 
FOR ALL
USING (auth.uid() = landlord_id);

-- Add trigger for lease_templates updated_at
CREATE TRIGGER update_lease_templates_updated_at
BEFORE UPDATE ON public.lease_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for lease documents and signatures (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lease-documents', 'lease-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for lease documents storage
CREATE POLICY "Users can view their lease documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'lease-documents' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    auth.uid() IN (
      SELECT t.landlord_id FROM public.tenancies t 
      WHERE t.id::text = (storage.foldername(name))[2]
    ) OR
    auth.uid() IN (
      SELECT t.tenant_id FROM public.tenancies t 
      WHERE t.id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Landlords can upload lease documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'lease-documents' AND 
  auth.uid() IN (
    SELECT t.landlord_id FROM public.tenancies t 
    WHERE t.id::text = (storage.foldername(name))[2]
  )
);

CREATE POLICY "Users can update their lease documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'lease-documents' AND 
  (
    auth.uid() IN (
      SELECT t.landlord_id FROM public.tenancies t 
      WHERE t.id::text = (storage.foldername(name))[2]
    ) OR
    auth.uid() IN (
      SELECT t.tenant_id FROM public.tenancies t 
      WHERE t.id::text = (storage.foldername(name))[2]
    )
  )
);
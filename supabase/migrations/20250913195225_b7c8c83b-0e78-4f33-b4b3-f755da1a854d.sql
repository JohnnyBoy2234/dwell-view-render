-- Fix the lease_signatures table reference
DROP TABLE IF EXISTS public.lease_signatures CASCADE;
DROP TABLE IF EXISTS public.lease_agreements CASCADE;

-- Recreate lease_agreements table
CREATE TABLE IF NOT EXISTS public.lease_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signatures', 'completed', 'cancelled')),
  lease_data JSONB NOT NULL,
  pdf_url TEXT,
  pdf_path TEXT,
  html_content TEXT,
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  landlord_signature_data JSONB,
  tenant_signature_data JSONB,
  immutable BOOLEAN DEFAULT FALSE,
  audit_trail JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_lease_agreements_property ON public.lease_agreements(property_id);
CREATE INDEX idx_lease_agreements_landlord ON public.lease_agreements(landlord_id);
CREATE INDEX idx_lease_agreements_tenant ON public.lease_agreements(tenant_id);
CREATE INDEX idx_lease_agreements_status ON public.lease_agreements(status);

-- Add trigger for updated_at
CREATE TRIGGER update_lease_agreements_updated_at
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Landlords can manage their lease agreements" ON public.lease_agreements; -- dedup for local replay
CREATE POLICY "Landlords can manage their lease agreements"
  ON public.lease_agreements
  FOR ALL
  USING (auth.uid() = landlord_id);

DROP POLICY IF EXISTS "Tenants can view and update their lease agreements" ON public.lease_agreements; -- dedup for local replay
CREATE POLICY "Tenants can view and update their lease agreements"
  ON public.lease_agreements
  FOR ALL
  USING (auth.uid() = tenant_id);

-- Create lease_signatures table with correct foreign key reference
CREATE TABLE IF NOT EXISTS public.lease_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.lease_agreements(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('landlord', 'tenant')),
  signature_type TEXT NOT NULL CHECK (signature_type IN ('electronic', 'digital')),
  signature_image_url TEXT,
  signature_data JSONB,
  ip_address INET,
  user_agent TEXT,
  otp_verified BOOLEAN DEFAULT FALSE,
  pdf_hash TEXT,
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for signatures
CREATE INDEX idx_lease_signatures_lease ON public.lease_signatures(lease_id);
CREATE INDEX idx_lease_signatures_signer ON public.lease_signatures(signer_id);

-- Enable RLS on signatures
ALTER TABLE public.lease_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signatures
DROP POLICY IF EXISTS "Users can view signatures for their lease agreements" ON public.lease_signatures; -- dedup for local replay
CREATE POLICY "Users can view signatures for their lease agreements"
  ON public.lease_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.lease_agreements la
      WHERE la.id = lease_signatures.lease_id
      AND (la.landlord_id = auth.uid() OR la.tenant_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create their own signatures" ON public.lease_signatures; -- dedup for local replay
CREATE POLICY "Users can create their own signatures"
  ON public.lease_signatures
  FOR INSERT
  WITH CHECK (auth.uid() = signer_id);

-- Create function to handle lease completion
CREATE OR REPLACE FUNCTION public.complete_lease_agreement()
RETURNS TRIGGER AS $$
BEGIN
  -- If both parties have signed, mark as completed and immutable
  IF NEW.landlord_signed_at IS NOT NULL AND NEW.tenant_signed_at IS NOT NULL THEN
    NEW.status := 'completed';
    NEW.immutable := TRUE;
    
    -- Add to audit trail
    NEW.audit_trail := COALESCE(NEW.audit_trail, '[]'::jsonb) || 
      jsonb_build_object(
        'action', 'completed',
        'timestamp', NOW(),
        'note', 'Both parties have signed - lease is now immutable'
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for lease completion
CREATE TRIGGER trigger_complete_lease_agreement
  BEFORE UPDATE ON public.lease_agreements
  FOR EACH ROW
  EXECUTE FUNCTION public.complete_lease_agreement();
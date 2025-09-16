-- Create lease management system tables

-- Main lease contracts table
CREATE TABLE public.lease_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id),
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  
  -- Contract content and metadata  
  title TEXT NOT NULL DEFAULT 'Rental Agreement',
  contract_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_tenant', 'pending_landlord', 'signed', 'expired', 'terminated')),
  version INTEGER NOT NULL DEFAULT 1,
  
  -- PDF and document handling
  pdf_url TEXT,
  pdf_hash TEXT, -- SHA-256 hash for tamper detection
  
  -- Signature tracking
  landlord_signed_at TIMESTAMPTZ,
  tenant_signed_at TIMESTAMPTZ,
  landlord_signature_data JSONB,
  tenant_signature_data JSONB,
  
  -- Audit and compliance
  audit_trail JSONB NOT NULL DEFAULT '[]',
  encryption_key_id TEXT, -- For document encryption reference
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- For pending contracts
  
  -- Search and indexing
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(contract_data->>'propertyAddress', ''))
  ) STORED
);

-- Contract templates for reuse
CREATE TABLE public.lease_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- E-signature audit logs for compliance
CREATE TABLE public.signature_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_contract_id UUID NOT NULL REFERENCES public.lease_contracts(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL,
  signer_role TEXT NOT NULL CHECK (signer_role IN ('landlord', 'tenant')),
  
  -- Signature verification data
  signature_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- ESIGN/UETA compliance data
  consent_method TEXT NOT NULL DEFAULT 'click_to_sign',
  document_hash TEXT NOT NULL, -- Hash of document at time of signing
  geolocation JSONB, -- Optional location data
  
  -- Verification metadata
  verification_data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.lease_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_templates ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.signature_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lease_contracts
CREATE POLICY "Landlords can manage their lease contracts" ON public.lease_contracts
  FOR ALL USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can view and sign their lease contracts" ON public.lease_contracts
  FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update signature data" ON public.lease_contracts
  FOR UPDATE USING (auth.uid() = tenant_id AND tenant_signed_at IS NULL);

-- RLS Policies for lease_templates  
CREATE POLICY "Landlords can manage their templates" ON public.lease_templates
  FOR ALL USING (auth.uid() = landlord_id);

-- RLS Policies for signature_audit
CREATE POLICY "Users can view audit logs for their signatures" ON public.signature_audit
  FOR SELECT USING (auth.uid() = signer_id);

CREATE POLICY "System can insert audit logs" ON public.signature_audit
  FOR INSERT WITH CHECK (TRUE);

-- Indexes for performance
CREATE INDEX idx_lease_contracts_landlord_id ON public.lease_contracts(landlord_id);
CREATE INDEX idx_lease_contracts_tenant_id ON public.lease_contracts(tenant_id);
CREATE INDEX idx_lease_contracts_status ON public.lease_contracts(status);
CREATE INDEX idx_lease_contracts_search ON public.lease_contracts USING GIN(search_vector);
CREATE INDEX idx_signature_audit_lease_id ON public.signature_audit(lease_contract_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lease_contracts_updated_at BEFORE UPDATE ON public.lease_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_templates_updated_at BEFORE UPDATE ON public.lease_templates  
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create audit trail entry
CREATE OR REPLACE FUNCTION add_lease_audit_entry(
  contract_id UUID,
  action TEXT,
  actor_id UUID,
  details JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
  UPDATE public.lease_contracts
  SET audit_trail = audit_trail || jsonb_build_array(
    jsonb_build_object(
      'timestamp', NOW(),
      'action', action,
      'actor_id', actor_id,
      'details', details
    )
  )
  WHERE id = contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
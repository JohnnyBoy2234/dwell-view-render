-- Create tables for MzanziHomes workflows

-- Offers table for the offer → lease workflow
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.properties(id),
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  status TEXT CHECK (status IN ('draft','sent','accepted','declined','expired')) DEFAULT 'draft',
  terms_json JSONB NOT NULL, -- rent, deposit, start, end, special conditions
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Workflow runs for audit trail across all workflows
CREATE TABLE public.workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  step TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices table for payment workflow
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id),
  number TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('draft','sent','pending','paid','overdue','cancelled')) DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Maintenance tickets table
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id),
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  category TEXT,
  urgency TEXT CHECK (urgency IN ('low','medium','high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('reported','triaged','vendor_assigned','in_progress','awaiting_approval','completed','disputed','closed')) DEFAULT 'reported',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  media JSONB DEFAULT '[]',
  sla_hours INTEGER DEFAULT 48,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  contractor_name TEXT,
  contractor_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offers
CREATE POLICY "Landlords can manage their offers" ON public.offers
FOR ALL USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can view and accept offers sent to them" ON public.offers
FOR SELECT USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update offers sent to them" ON public.offers
FOR UPDATE USING (auth.uid() = tenant_id);

-- RLS Policies for workflow_runs
CREATE POLICY "Users can view workflow runs for their entities" ON public.workflow_runs
FOR SELECT USING (
  (entity_type = 'lease' AND entity_id IN (
    SELECT id FROM public.leases WHERE landlord_user_id = auth.uid() OR tenant_user_id = auth.uid()
  )) OR
  (entity_type = 'offer' AND entity_id IN (
    SELECT id FROM public.offers WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
  )) OR
  (entity_type = 'maintenance' AND entity_id IN (
    SELECT id FROM public.maintenance_tickets WHERE tenant_id = auth.uid() OR landlord_id = auth.uid()
  ))
);

CREATE POLICY "System can insert workflow runs" ON public.workflow_runs
FOR INSERT WITH CHECK (true);

-- RLS Policies for invoices
CREATE POLICY "Landlords can view invoices for their leases" ON public.invoices
FOR SELECT USING (
  lease_id IN (SELECT id FROM public.leases WHERE landlord_user_id = auth.uid())
);

CREATE POLICY "Tenants can view their invoices" ON public.invoices
FOR SELECT USING (
  lease_id IN (SELECT id FROM public.leases WHERE tenant_user_id = auth.uid())
);

CREATE POLICY "System can manage invoices" ON public.invoices
FOR ALL USING (true);

-- RLS Policies for maintenance_tickets
CREATE POLICY "Tenants can create and view their maintenance tickets" ON public.maintenance_tickets
FOR ALL USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can view and update maintenance tickets for their properties" ON public.maintenance_tickets
FOR ALL USING (auth.uid() = landlord_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column_generic()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON public.offers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_generic();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_generic();

CREATE TRIGGER update_maintenance_tickets_updated_at
    BEFORE UPDATE ON public.maintenance_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column_generic();

-- Add indexes for performance
CREATE INDEX idx_offers_landlord_id ON public.offers(landlord_id);
CREATE INDEX idx_offers_tenant_id ON public.offers(tenant_id);
CREATE INDEX idx_offers_listing_id ON public.offers(listing_id);
CREATE INDEX idx_workflow_runs_entity ON public.workflow_runs(entity_type, entity_id);
CREATE INDEX idx_invoices_lease_id ON public.invoices(lease_id);
CREATE INDEX idx_maintenance_tickets_property_id ON public.maintenance_tickets(property_id);
CREATE INDEX idx_maintenance_tickets_tenant_id ON public.maintenance_tickets(tenant_id);
CREATE INDEX idx_maintenance_tickets_landlord_id ON public.maintenance_tickets(landlord_id);
-- Create tenancies table for tracking active leases
CREATE TABLE public.tenancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  security_deposit NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'terminated')),
  lease_document_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rent_payments table for tracking payment history
CREATE TABLE public.rent_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenancy_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN ('bank_transfer', 'cash', 'check', 'online')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create maintenance_requests table for tracking maintenance issues
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL CHECK (category IN ('plumbing', 'electrical', 'heating', 'appliance', 'structural', 'pest_control', 'cleaning', 'other')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'completed', 'cancelled')),
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  contractor_name TEXT,
  contractor_contact TEXT,
  scheduled_date DATE,
  completed_date DATE,
  images TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenancies
CREATE POLICY "Landlords can view their tenancies"
ON public.tenancies
FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can view their tenancies"
ON public.tenancies
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords can create tenancies"
ON public.tenancies
FOR INSERT
WITH CHECK (auth.uid() = landlord_id AND has_role(auth.uid(), 'landlord'::user_role));

CREATE POLICY "Landlords can update their tenancies"
ON public.tenancies
FOR UPDATE
USING (auth.uid() = landlord_id);

-- Create RLS policies for rent_payments
CREATE POLICY "Landlords can view rent payments for their tenancies"
ON public.rent_payments
FOR SELECT
USING (tenancy_id IN (SELECT id FROM tenancies WHERE landlord_id = auth.uid()));

CREATE POLICY "Tenants can view their rent payments"
ON public.rent_payments
FOR SELECT
USING (tenancy_id IN (SELECT id FROM tenancies WHERE tenant_id = auth.uid()));

CREATE POLICY "Landlords can manage rent payments"
ON public.rent_payments
FOR ALL
USING (tenancy_id IN (SELECT id FROM tenancies WHERE landlord_id = auth.uid()));

-- Create RLS policies for maintenance_requests
CREATE POLICY "Landlords can view maintenance requests for their properties"
ON public.maintenance_requests
FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can view their maintenance requests"
ON public.maintenance_requests
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can create maintenance requests"
ON public.maintenance_requests
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Landlords can update maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Tenants can update their own maintenance requests"
ON public.maintenance_requests
FOR UPDATE
USING (auth.uid() = tenant_id AND status = 'submitted');

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_tenancies_updated_at
BEFORE UPDATE ON public.tenancies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rent_payments_updated_at
BEFORE UPDATE ON public.rent_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at
BEFORE UPDATE ON public.maintenance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_tenancies_property_id ON public.tenancies(property_id);
CREATE INDEX idx_tenancies_tenant_id ON public.tenancies(tenant_id);
CREATE INDEX idx_tenancies_landlord_id ON public.tenancies(landlord_id);
CREATE INDEX idx_tenancies_status ON public.tenancies(status);

CREATE INDEX idx_rent_payments_tenancy_id ON public.rent_payments(tenancy_id);
CREATE INDEX idx_rent_payments_due_date ON public.rent_payments(due_date);
CREATE INDEX idx_rent_payments_status ON public.rent_payments(status);

CREATE INDEX idx_maintenance_requests_property_id ON public.maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests(tenant_id);
CREATE INDEX idx_maintenance_requests_landlord_id ON public.maintenance_requests(landlord_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_priority ON public.maintenance_requests(priority);
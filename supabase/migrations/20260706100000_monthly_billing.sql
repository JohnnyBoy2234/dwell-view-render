-- Monthly billing: bills + line items
CREATE TABLE public.monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  period TEXT NOT NULL, -- 'YYYY-MM'
  rent_amount NUMERIC(10,2) NOT NULL,
  total_amount NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'awaiting_landlord'
    CHECK (status IN ('awaiting_landlord','sent','paid')),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  paystack_reference TEXT,
  receipt_pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenancy_id, period)
);

CREATE TABLE public.bill_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES public.monthly_bills(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('water','sewage','electricity','refuse','other')),
  label TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_line_items ENABLE ROW LEVEL SECURITY;

-- Landlord: full read of own bills
CREATE POLICY "Landlords read own bills" ON public.monthly_bills
  FOR SELECT USING (landlord_id = auth.uid());

-- Tenant: only sent/paid bills (drafts invisible)
CREATE POLICY "Tenants read sent bills" ON public.monthly_bills
  FOR SELECT USING (tenant_id = auth.uid() AND status IN ('sent','paid'));

-- Line items follow the parent bill's visibility
CREATE POLICY "Read line items via bill" ON public.bill_line_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.monthly_bills b
    WHERE b.id = bill_id
      AND (b.landlord_id = auth.uid()
           OR (b.tenant_id = auth.uid() AND b.status IN ('sent','paid')))
  ));

-- All writes go through edge functions (service role bypasses RLS);
-- no INSERT/UPDATE policies for authenticated users on purpose.

CREATE TRIGGER update_monthly_bills_updated_at
  BEFORE UPDATE ON public.monthly_bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for the tenant banner (status changes must push instantly)
ALTER TABLE public.monthly_bills REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_bills;

CREATE INDEX idx_monthly_bills_tenant_status ON public.monthly_bills (tenant_id, status);
CREATE INDEX idx_monthly_bills_landlord_status ON public.monthly_bills (landlord_id, status);
CREATE INDEX idx_monthly_bills_reference ON public.monthly_bills (paystack_reference);

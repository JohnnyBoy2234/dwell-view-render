-- Add Paystack subaccount code to profiles table
ALTER TABLE public.profiles 
ADD COLUMN paystack_subaccount_code TEXT;

-- Create payments table for tracking rent payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id UUID NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  payment_type TEXT NOT NULL, -- 'deposit', 'first_month_rent', 'monthly_rent'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  paystack_reference TEXT,
  paystack_transaction_id TEXT,
  payment_date TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Landlords can view payments for their tenancies" 
ON public.payments 
FOR SELECT 
USING (landlord_id = auth.uid());

CREATE POLICY "Tenants can view their own payments" 
ON public.payments 
FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "System can manage payments" 
ON public.payments 
FOR ALL 
USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
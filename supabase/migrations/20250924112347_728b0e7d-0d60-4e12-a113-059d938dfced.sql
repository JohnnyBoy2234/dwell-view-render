-- Create transactions table for accounting system
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  vat_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL,
  vendor TEXT,
  description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed demo data for testing
INSERT INTO public.transactions (user_id, property_id, type, date, amount, vat_percent, category, vendor, description, billable)
SELECT 
  p.landlord_id,
  p.id,
  'income',
  DATE '2025-01-01' + (random() * 60)::integer,
  10000 + (random() * 2000),
  0,
  'Rent',
  'Tenant',
  'Monthly rental payment',
  false
FROM public.properties p
LIMIT 5;

INSERT INTO public.transactions (user_id, property_id, type, date, amount, vat_percent, category, vendor, description, billable)
SELECT 
  p.landlord_id,
  p.id,
  'expense',
  '2025-01-05',
  2000,
  15,
  'Maintenance',
  'PlumbPro CC',
  'Burst pipe repair',
  true
FROM public.properties p
LIMIT 1;

INSERT INTO public.transactions (user_id, property_id, type, date, amount, vat_percent, category, vendor, description, billable)
SELECT 
  p.landlord_id,
  p.id,
  'expense',
  '2025-01-20',
  1200,
  0,
  'Utilities (Water/Electricity)',
  'City of CT',
  'September usage',
  false
FROM public.properties p
LIMIT 1;
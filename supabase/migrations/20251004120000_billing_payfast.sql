-- Billing tables for PayFast integration

CREATE TABLE IF NOT EXISTS public.billing_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  pf_payment_id TEXT,
  reference TEXT,
  user_id UUID NOT NULL,
  plan_code TEXT,
  amount NUMERIC,
  status TEXT,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  user_id UUID PRIMARY KEY,
  plan_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  provider TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- Basic read access for the owner (guarded create)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'billing_payments' AND policyname = 'Users can view their payments'
  ) THEN
    CREATE POLICY "Users can view their payments" ON public.billing_payments FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'billing_subscriptions' AND policyname = 'Users can view their subscription'
  ) THEN
    CREATE POLICY "Users can view their subscription" ON public.billing_subscriptions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- System can insert via SECURITY DEFINER functions (edge functions use service role)



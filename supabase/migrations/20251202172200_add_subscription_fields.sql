ALTER TABLE public.billing_subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

-- Create function to handle subscription updates
CREATE OR REPLACE FUNCTION public.handle_subscription_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp
  NEW.updated_at = now();
  
  -- If this is a new subscription or the status changed to active
  IF (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active')) THEN
    -- Set the started_at timestamp if this is a new active subscription
    NEW.started_at = COALESCE(NEW.started_at, now());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_subscription_updated ON public.billing_subscriptions;
CREATE TRIGGER on_subscription_updated
  BEFORE INSERT OR UPDATE ON public.billing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_updated();
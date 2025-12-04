ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS plan_last_synced TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.billing_subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;

UPDATE public.profiles
SET plan = COALESCE(NULLIF(plan, ''), 'free'),
    plan_status = COALESCE(NULLIF(plan_status, ''), 'inactive'),
    plan_last_synced = COALESCE(plan_last_synced, now())
WHERE plan IS NULL OR plan_status IS NULL OR plan_last_synced IS NULL;

WITH latest_subscription AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    plan_code,
    status,
    current_period_end,
    trial_end,
    updated_at
  FROM public.billing_subscriptions
  ORDER BY user_id, updated_at DESC
)
UPDATE public.profiles p
SET plan = CASE
      WHEN ls.plan_code ILIKE '%premium%' THEN 'premium'
      WHEN ls.plan_code ILIKE '%pro%' THEN 'pro'
      ELSE 'free'
    END,
    plan_status = COALESCE(ls.status, 'inactive'),
    plan_expires_at = COALESCE(ls.current_period_end, ls.trial_end),
    plan_last_synced = COALESCE(ls.updated_at, now())
FROM latest_subscription ls
WHERE ls.user_id = p.user_id;

CREATE OR REPLACE FUNCTION public.update_profile_plan_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
  normalized_plan TEXT := 'free';
BEGIN
  IF NEW.plan_code ILIKE '%premium%' THEN
    normalized_plan := 'premium';
  ELSIF NEW.plan_code ILIKE '%pro%' THEN
    normalized_plan := 'pro';
  ELSE
    normalized_plan := 'free';
  END IF;

  UPDATE public.profiles
  SET plan = normalized_plan,
      plan_status = COALESCE(NEW.status, 'inactive'),
      plan_expires_at = COALESCE(NEW.current_period_end, NEW.trial_end),
      plan_last_synced = now(),
      updated_at = now()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_subscription_profile_sync ON public.billing_subscriptions;
CREATE TRIGGER on_subscription_profile_sync
AFTER INSERT OR UPDATE ON public.billing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_plan_from_subscription();


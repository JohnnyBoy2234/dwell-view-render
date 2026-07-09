import { ReactNode } from 'react';
import { useSubscription, PlanType } from '@mzanzihomes/supabase/hooks/useSubscription';
import { UpgradePrompt } from './subscription/UpgradePrompt';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
}

export function PlanGuard({ children, requiredPlan, featureName }: PlanGuardProps) {
  const { isSubscriber, loading } = useSubscription();

  if (requiredPlan === 'free') return <>{children}</>;
  if (loading) return null; // avoid flashing the prompt while plan state loads
  if (isSubscriber) return <>{children}</>;
  return <UpgradePrompt featureName={featureName} />;
}

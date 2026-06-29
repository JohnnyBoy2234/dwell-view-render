import { ReactNode, useEffect, useState } from 'react';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { UpgradePrompt } from './subscription/UpgradePrompt';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { useAuth } from '@/hooks/useAuth';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
}

export function PlanGuard({ children, requiredPlan, featureName }: PlanGuardProps) {
  // Temporary bypass: always render children while plan gating is disabled
  return <>{children}</>;
}

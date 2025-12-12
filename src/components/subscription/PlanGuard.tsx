import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Lock } from 'lucide-react';

type PlanType = 'free' | 'pro' | 'premium';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
  redirectTo?: string;
}

const PLAN_NAMES = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium'
} as const;

export function PlanGuard({ 
  children, 
  requiredPlan, 
  featureName = 'This feature',
  redirectTo = '/pricing'
}: PlanGuardProps) {
  // Temporary bypass: always render children while plan gating is disabled
  return <>{children}</>;
}

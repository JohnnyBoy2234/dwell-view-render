import { ReactNode, useState } from 'react';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { UpgradePrompt } from './subscription/UpgradePrompt';
import { Loader2 } from 'lucide-react';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
}

export function PlanGuard({ children, requiredPlan, featureName }: PlanGuardProps) {
  const { plan, loading, hasAccess } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess(requiredPlan)) {
    // Show upgrade prompt immediately
    if (!showUpgradePrompt) {
      setShowUpgradePrompt(true);
    }

    return (
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        requiredPlan={requiredPlan}
        currentPlan={plan}
        featureName={featureName}
      />
    );
  }

  return <>{children}</>;
}

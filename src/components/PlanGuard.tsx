import { ReactNode, useEffect, useState } from 'react';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { UpgradePrompt } from './subscription/UpgradePrompt';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface PlanGuardProps {
  children: ReactNode;
  requiredPlan: PlanType;
  featureName?: string;
}

export function PlanGuard({ children, requiredPlan, featureName }: PlanGuardProps) {
  const { isLandlord } = useAuth();
  const { plan, loading, hasAccess } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  const hasPlanAccess = hasAccess(requiredPlan);

  useEffect(() => {
    if (!loading && !hasPlanAccess && !dismissedPrompt) {
      setShowUpgradePrompt(true);
    }
  }, [loading, hasPlanAccess, dismissedPrompt]);

  const handlePromptChange = (open: boolean) => {
    setShowUpgradePrompt(open);
    if (!open) {
      setDismissedPrompt(true);
    }
  };

  if (!isLandlord) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasPlanAccess) {
    if (showUpgradePrompt && !dismissedPrompt) {
      return (
        <UpgradePrompt
          open={showUpgradePrompt}
          onOpenChange={handlePromptChange}
          requiredPlan={requiredPlan}
          currentPlan={plan}
          featureName={featureName}
        />
      );
    }

    const requirementCopy = featureName
      ? `The ${featureName} feature is only available on the ${requiredPlan} plan.`
      : `This area requires a ${requiredPlan} subscription.`;

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2 max-w-md">
          <p className="text-xl font-semibold">Upgrade Required</p>
          <p className="text-muted-foreground">{requirementCopy}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => {
              setDismissedPrompt(false);
              setShowUpgradePrompt(true);
            }}
          >
            Unlock Feature
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDismissedPrompt(false);
              setShowUpgradePrompt(true);
            }}
          >
            View Plans
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

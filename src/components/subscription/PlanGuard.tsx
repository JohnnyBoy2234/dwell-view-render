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
  const { plan, loading } = useSubscription();
  const navigate = useNavigate();

  // Access levels for each plan
  const planLevels = {
    free: 0,
    pro: 1,
    premium: 2
  };

  // If still loading, show nothing or a loading state
  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  // Check if user's plan meets the required level
  const hasAccess = planLevels[plan] >= planLevels[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show upgrade prompt if user doesn't have access
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Alert className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
        <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-lg font-medium text-amber-800 dark:text-amber-200">
          {featureName} requires {PLAN_NAMES[requiredPlan]} Plan
        </AlertTitle>
        <AlertDescription className="mt-2 text-amber-700 dark:text-amber-300">
          Upgrade to {PLAN_NAMES[requiredPlan]} to access this feature and more.
        </AlertDescription>
        <div className="mt-4 flex gap-3">
          <Button 
            onClick={() => navigate(redirectTo)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Upgrade to {PLAN_NAMES[requiredPlan]}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="border-amber-600 text-amber-700 hover:bg-amber-100"
          >
            Go Back
          </Button>
        </div>
      </Alert>
    </div>
  );
}

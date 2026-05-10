import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2 } from "lucide-react";

interface SubscriptionGuardProps {
  children: ReactNode;
  requiredPlan: 'free' | 'pro' | 'premium';
  fallbackPath?: string;
}

export function SubscriptionGuard({ 
  children, 
  requiredPlan = 'free',
  fallbackPath = "/upgrade" 
}: SubscriptionGuardProps) {
  const { hasAccess, loading } = useSubscription();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !hasAccess(requiredPlan)) {
      navigate(fallbackPath);
    }
  }, [hasAccess, requiredPlan, loading, navigate, fallbackPath]);

  // Still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Checking subscription status...</p>
        </div>
      </div>
    );
  }

  // If user has access, render children
  if (hasAccess(requiredPlan)) {
    return <>{children}</>;
  }

  // If no access, but navigation will happen in the effect
  return null;
}

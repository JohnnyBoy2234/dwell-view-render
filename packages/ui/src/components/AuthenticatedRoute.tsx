import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@mzanzihomes/supabase/hooks/useAuth";
import { LoadingLogo } from "@mzanzihomes/ui/components/LoadingLogo";

// Pure auth gate: requires a signed-in user. Role gating (landlord vs tenant)
// is owned by each app's root guard (LandlordRoleGuard / TenantRoleGuard), so it
// deliberately lives here.
interface AuthenticatedRouteProps {
  children: ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export function AuthenticatedRoute({ children, fallbackPath = "/auth" }: AuthenticatedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate(fallbackPath);
  }, [loading, user, fallbackPath, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

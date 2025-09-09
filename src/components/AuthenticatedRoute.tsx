import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useKyc } from "@/hooks/useKyc";
import { Loader2 } from "lucide-react";

interface AuthenticatedRouteProps {
  children: ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export function AuthenticatedRoute({ 
  children, 
  requireVerification = true, 
  fallbackPath = "/verify-id" 
}: AuthenticatedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { kycProfile, loading: kycLoading } = useKyc();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!authLoading && !kycLoading && user && requireVerification) {
      // Check if user needs verification
      if (!kycProfile || kycProfile.status !== 'approved') {
        navigate(fallbackPath);
        return;
      }
    }
  }, [authLoading, kycLoading, user, kycProfile, requireVerification, navigate, fallbackPath]);

  // Still loading
  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null;
  }

  // Verification required but not approved
  if (requireVerification && (!kycProfile || kycProfile.status !== 'approved')) {
    return null;
  }

  return <>{children}</>;
}
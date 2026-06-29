import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingLogo } from "@/components/ui/LoadingLogo";

// This is the tenant app - a landlord-only account (no admin override) doesn't belong here.
const LANDLORD_APP_URL = "https://mzanzihomes-landlord.vercel.app";

interface AuthenticatedRouteProps {
  children: ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { user, loading, isLandlord, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isLandlord && !isAdmin) {
      window.location.href = LANDLORD_APP_URL;
    }
  }, [loading, user, isLandlord, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  if (!user) return null;
  if (isLandlord && !isAdmin) return null;

  return <>{children}</>;
}
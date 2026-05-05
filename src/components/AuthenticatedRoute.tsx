import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingLogo } from "@/components/ui/LoadingLogo";

interface AuthenticatedRouteProps {
  children: ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
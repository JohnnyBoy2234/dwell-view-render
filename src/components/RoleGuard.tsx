import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: "landlord" | "tenant";
  fallbackPath?: string;
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  fallbackPath 
}: RoleGuardProps) {
  const { user, loading: isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (!isLoading && user && requiredRole && user.role !== requiredRole) {
      // Redirect to appropriate dashboard based on user's actual role
      if (user.role === "landlord") {
        navigate("/enhancedlandlorddashboard");
      } else if (user.role === "tenant") {
        navigate("/enhancedtenantdashboard");
      } else {
        navigate(fallbackPath || "/");
      }
    }
  }, [user, isLoading, requiredRole, navigate, fallbackPath]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // If no specific role is required, just check if user is authenticated
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check if user has the required role
  if (user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}

// Special guard for properties routing
export function PropertiesRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading: isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  // Allow all authenticated users to view the properties page
  return <>{children}</>;
}

import { ReactNode } from "react";
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
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // If no specific role is required, just check if user is authenticated
  if (!requiredRole) {
    return <>{children}</>;
  }

  // Check if user has the required role
  if (user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's actual role
    if (user.role === "landlord") {
      navigate("/enhancedlandlorddashboard");
    } else if (user.role === "tenant") {
      navigate("/enhancedtenantdashboard");
    } else {
      navigate(fallbackPath || "/");
    }
    return null;
  }

  return <>{children}</>;
}

// Special guard for properties routing
export function PropertiesRouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // Redirect to appropriate dashboard based on user role
  if (user.role === "landlord") {
    navigate("/enhancedlandlorddashboard/properties");
    return null;
  } else if (user.role === "tenant") {
    navigate("/enhancedtenantdashboard/properties");
    return null;
  }

  // Fallback for unknown roles
  navigate("/");
  return null;
}

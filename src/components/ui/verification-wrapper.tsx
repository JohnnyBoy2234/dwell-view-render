import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useKyc } from "@/hooks/useKyc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, AlertTriangle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VerificationWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function VerificationWrapper({ 
  children, 
  title = "Verification Required",
  description = "Please complete your identity verification to access this feature."
}: VerificationWrapperProps) {
  const { user, loading: authLoading } = useAuth();
  const { kycProfile, loading: kycLoading } = useKyc();
  const navigate = useNavigate();

  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  // If user is approved, show the content
  if (kycProfile?.status === 'approved') {
    return <>{children}</>;
  }

  // Show verification status
  const getStatusInfo = () => {
    if (!kycProfile || kycProfile.status === 'not_started') {
      return {
        icon: Shield,
        title: "Identity Verification Required",
        description: "Complete your identity verification to access this feature.",
        action: "Start Verification",
        actionLink: "/verify-id"
      };
    }

    if (kycProfile.status === 'submitted') {
      return {
        icon: Clock,
        title: "Verification In Progress",
        description: "Your identity verification is being reviewed. You'll be notified once complete.",
        action: "Check Status",
        actionLink: "/verify-id"
      };
    }

    if (kycProfile.status === 'declined') {
      return {
        icon: AlertTriangle,
        title: "Verification Declined",
        description: kycProfile.notes || "Your verification was declined. Please review and resubmit.",
        action: "Resubmit Documents",
        actionLink: "/verify-id"
      };
    }

    return {
      icon: Shield,
      title,
      description,
      action: "Verify Now",
      actionLink: "/verify-id"
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{statusInfo.title}</CardTitle>
          <CardDescription>{statusInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={() => navigate(statusInfo.actionLink)}
            className="w-full"
          >
            {statusInfo.action}
          </Button>
          
          {kycProfile?.status === 'submitted' && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Review in progress:</strong> Our team typically reviews submissions within 1-2 business days.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
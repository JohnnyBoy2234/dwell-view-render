import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useKyc } from "@/hooks/useKyc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Clock } from "lucide-react";
import { LoadingLogo } from "@/components/ui/LoadingLogo";

interface VerificationGateProps {
  children: ReactNode;
  requireVerification?: boolean;
  fallbackPath?: string;
}

export function VerificationGate({ 
  children, 
  requireVerification = true, 
  fallbackPath = "/verify-id" 
}: VerificationGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { kycProfile, loading: kycLoading } = useKyc();
  const navigate = useNavigate();
  const [showBlockedMessage, setShowBlockedMessage] = useState(false);

  useEffect(() => {
    if (!authLoading && !kycLoading && user && requireVerification) {
      if (!kycProfile || kycProfile.status !== 'approved') {
        setShowBlockedMessage(true);
      } else {
        setShowBlockedMessage(false);
      }
    }
  }, [authLoading, kycLoading, user, kycProfile, requireVerification]);

  // Still loading
  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingLogo size="lg" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    navigate("/auth");
    return null;
  }

  // Verification not required, show content
  if (!requireVerification) {
    return <>{children}</>;
  }

  // User is verified, show content
  if (kycProfile?.status === 'approved') {
    return <>{children}</>;
  }

  // Show blocked message
  if (showBlockedMessage) {
    const getStatusMessage = () => {
      if (!kycProfile || kycProfile.status === 'not_started') {
        return {
          icon: Shield,
          title: "Identity Verification Required",
          description: "Please complete your identity verification to access this feature.",
          action: "Start Verification",
          variant: "default" as const
        };
      }
      
      if (kycProfile.status === 'submitted') {
        return {
          icon: Clock,
          title: "ID Verification In Progress",
          description: "Your identity verification is being reviewed. You'll be notified once complete.",
          action: "Check Status",
          variant: "default" as const
        };
      }
      
      if (kycProfile.status === 'declined') {
        return {
          icon: AlertTriangle,
          title: "ID Verification Declined", 
          description: kycProfile.notes || "Your verification was declined. Please review and resubmit.",
          action: "Resubmit Documents",
          variant: "destructive" as const
        };
      }

      return {
        icon: Shield,
        title: "Verification Required",
        description: "Please complete identity verification to continue.",
        action: "Verify Now",
        variant: "default" as const
      };
    };

    const status = getStatusMessage();
    const Icon = status.icon;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{status.title}</CardTitle>
            <CardDescription>{status.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {kycProfile?.status === 'submitted' ? (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>What happens next:</strong> Our team typically reviews submissions within 1-2 business days. 
                  You'll receive a notification once your verification is complete.
                </AlertDescription>
              </Alert>
            ) : (
              <Button 
                onClick={() => navigate(fallbackPath)}
                className="w-full"
                variant={status.variant === 'destructive' ? 'destructive' : 'default'}
              >
                {status.action}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback
  return <>{children}</>;
}
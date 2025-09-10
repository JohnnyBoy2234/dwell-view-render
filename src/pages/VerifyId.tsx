import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKyc } from '@/hooks/useKyc';
import { EmailVerificationGate } from '@/components/kyc/EmailVerificationGate';
import { EnhancedKycWizard } from '@/components/kyc/EnhancedKycWizard';
import { KycStatusPill } from '@/components/kyc/KycStatusPill';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export default function VerifyId() {
  const { user, loading: authLoading } = useAuth();
  const { kycProfile, loading: kycLoading, resubmit } = useKyc();
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    if (user?.email_confirmed_at) {
      setEmailVerified(true);
    }
  }, [user]);

  // Show loading while checking auth
  if (authLoading || kycLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show email verification gate if email not confirmed
  if (!emailVerified) {
    return <EmailVerificationGate onVerified={() => setEmailVerified(true)} />;
  }

  // Show appropriate content based on KYC status
  const renderContent = () => {
    if (!kycProfile || kycProfile.status === 'not_started') {
      return <EnhancedKycWizard onComplete={() => window.location.reload()} />;
    }

    switch (kycProfile.status) {
      case 'submitted':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">Under Review</CardTitle>
                <CardDescription>
                  Your identity verification is being reviewed
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 text-center">
                <KycStatusPill status={kycProfile.status} size="lg" />
                
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    We're reviewing your documents. You'll receive a notification once the verification is complete. 
                    This usually takes 1-3 business days.
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Submitted: {new Date(kycProfile.submitted_at!).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'approved':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <CardTitle className="text-2xl font-bold text-success">ID Verified ✅</CardTitle>
                <CardDescription>
                  Your identity has been successfully verified
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 text-center">
                <KycStatusPill status={kycProfile.status} size="lg" />
                
                <Alert className="border-success/20 bg-success/5">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success-foreground">
                    Congratulations! Your identity verification is complete. 
                    You now have full access to all platform features.
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Approved: {new Date(kycProfile.reviewed_at!).toLocaleDateString()}</p>
                </div>

                <Button 
                  onClick={() => window.location.href = '/'}
                  className="w-full"
                >
                  Continue to Home Page
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'declined':
        return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-2xl font-bold">Verification Declined</CardTitle>
                <CardDescription>
                  Your identity verification was not approved
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <KycStatusPill status={kycProfile.status} size="lg" />
                
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Reason:</strong> {kycProfile.notes || 'Please ensure your documents are clear and valid.'}
                  </AlertDescription>
                </Alert>

                <div className="text-sm text-muted-foreground space-y-1 text-center">
                  <p>Reviewed: {new Date(kycProfile.reviewed_at!).toLocaleDateString()}</p>
                </div>

                <Button 
                  onClick={resubmit}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <Navigate to="/" replace />;
    }
  };

  return renderContent();
}
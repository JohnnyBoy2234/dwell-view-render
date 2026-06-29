import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailVerificationGateProps {
  onVerified: () => void;
}

export function EmailVerificationGate({ onVerified }: EmailVerificationGateProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastSent, setLastSent] = useState<Date | null>(null);

  // Poll for verification status every 5 seconds
  useEffect(() => {
    if (!user) return;

    const checkVerification = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email_confirmed_at) {
          onVerified();
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      }
    };

    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, [user, onVerified]);

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      setLastSent(new Date());
      toast({
        title: "Verification email sent",
        description: "Please check your email and click the verification link.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send verification email",
        description: error.message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        toast({
          title: "Email verified!",
          description: "Your email has been verified successfully.",
        });
        onVerified();
      } else {
        toast({
          variant: "destructive",
          title: "Email not verified",
          description: "Please check your email and click the verification link first.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Check failed",
        description: error.message,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const canResend = !lastSent || (Date.now() - lastSent.getTime()) > 60000; // 1 minute cooldown

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            Please verify your email address to continue with identity verification
            <br />
            <span className="font-medium text-foreground">{user?.email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Check your email</strong> for a verification link. It may be in your spam folder.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  I've Verified My Email
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleResendEmail}
              disabled={isResending || !canResend}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {canResend ? 'Resend Verification Email' : 
                   `Wait ${60 - Math.floor((Date.now() - (lastSent?.getTime() || 0)) / 1000)}s`}
                </>
              )}
            </Button>
          </div>

          {lastSent && (
            <p className="text-xs text-center text-muted-foreground">
              Last sent: {lastSent.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
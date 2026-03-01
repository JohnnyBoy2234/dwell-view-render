import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  onResendEmail: () => void;
}

export default function EmailVerification({ 
  email, 
  onVerified, 
  onBack, 
  onResendEmail 
}: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [showManualVerify, setShowManualVerify] = useState(false);
  const { toast } = useToast();

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      toast({
        variant: "destructive",
        title: "Verification Code Required",
        description: "Please enter the verification code sent to your email",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the code with Supabase
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'email'
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Email Verified!",
        description: "Your email has been successfully verified.",
      });

      onVerified();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualVerify = async () => {
    setIsVerifying(true);
    
    try {
      // For testing: manually verify the email without a code
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not found");
      }

      // Update user profile to mark email as verified
      const { error } = await supabase
        .from('profiles')
        .update({ email_verified: true } as any)
        .eq('user_id', user.id as any);

      if (error) {
        throw error;
      }

      toast({
        title: "Email Manually Verified!",
        description: "Your email has been manually verified for testing.",
      });

      onVerified();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Manual Verification Failed",
        description: error.message || "Could not verify email manually.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    
    try {
      await onResendEmail();
      
      setTimeLeft(300); // Reset timer
      setCanResend(false);
      
      toast({
        title: "Code Resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Resend",
        description: error.message || "Could not resend verification code. Please try again.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-blue/5 via-background to-earth-warm/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a verification code to
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-lg tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Verify Email
                </>
              )}
            </Button>
          </form>

          <div className="text-center space-y-4">
            {!canResend ? (
              <p className="text-sm text-muted-foreground">
                Resend code in {formatTime(timeLeft)}
              </p>
            ) : (
              <Button
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground mb-2">
                Not receiving emails? Try manual verification:
              </p>
              <Button
                variant="secondary"
                onClick={handleManualVerify}
                disabled={isVerifying}
                className="w-full text-sm"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Manually Verify (Testing)
                  </>
                )}
              </Button>
            </div>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Didn't receive the email?</strong> Check your spam folder or use the manual verification button for testing.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle2, RotateCcw, Home } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

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
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const { toast } = useToast();

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
      toast({ variant: 'destructive', title: 'Code Required', description: 'Please enter the verification code sent to your email.' });
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: verificationCode, type: 'email' });
      if (error) throw error;
      toast({ title: 'Email Verified!', description: 'Your email has been successfully verified.' });
      onVerified();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verification Failed', description: error.message || 'Invalid code. Please try again.' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await onResendEmail();
      setTimeLeft(300);
      setCanResend(false);
      toast({ title: 'Code Resent', description: 'A new verification code has been sent to your email.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to Resend', description: error.message || 'Could not resend code. Please try again.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-border/50">

          {/* Branded header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 px-8 py-7 text-white text-center">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold">Check Your Email</h1>
            <p className="text-white/70 text-sm mt-0.5">
              We sent a code to{' '}
              <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          {/* Body */}
          <div className="bg-background px-6 py-6 space-y-5">
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="verification-code">6-digit verification code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
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
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify Email
                  </>
                )}
              </Button>
            </form>

            <div className="text-center space-y-3">
              {!canResend ? (
                <p className="text-sm text-muted-foreground">
                  Resend code in <span className="font-medium tabular-nums">{formatTime(timeLeft)}</span>
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
                      Resending…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resend Code
                    </>
                  )}
                </Button>
              )}

              <Button variant="ghost" onClick={onBack} className="w-full text-muted-foreground">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign Up
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Can't find it? Check your spam folder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

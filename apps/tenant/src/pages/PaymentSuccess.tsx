import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

type VerificationStatus = 'loading' | 'success' | 'pending' | 'timeout' | 'failed';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const [reference] = useState(searchParams.get('reference'));
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [planCode, setPlanCode] = useState<string>('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Start verification process if we have a reference
    if (reference) {
      verifyPayment(reference);
    } else {
      // If no reference, assume success (legacy behavior)
      setVerificationStatus('success');
      triggerConfetti();
    }
  }, [user, navigate, reference]);

  const activateSubscriptionFallback = async (ref: string): Promise<boolean> => {
    try {
      console.log('[PaymentSuccess] Attempting fallback subscription activation...');
      
      const { data, error } = await supabase.functions.invoke('activate-subscription', {
        body: { reference: ref }
      });

      if (error) {
        console.error('[PaymentSuccess] Fallback activation error:', error);
        return false;
      }

      if (data?.success) {
        console.log('[PaymentSuccess] Fallback activation successful:', data);
        return true;
      }

      console.log('[PaymentSuccess] Fallback activation returned:', data);
      return false;
    } catch (error) {
      console.error('[PaymentSuccess] Fallback activation exception:', error);
      return false;
    }
  };

  const verifyPayment = async (ref: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts) {
      try {
        // Check payment status
        const { data: payment, error: paymentError } = await (supabase as any)
          .from('billing_payments')
          .select('status, plan_code')
          .eq('reference', ref)
          .maybeSingle();
        
        if (paymentError) {
          console.error('Error fetching payment:', paymentError);
        }
        
        if (payment?.status === 'complete') {
          // Check subscription activation
          const { data: subscription, error: subError } = await (supabase as any)
            .from('billing_subscriptions')
            .select('*')
            .eq('user_id', user!.id)
            .eq('status', 'active')
            .maybeSingle();
          
          if (subError) {
            console.error('Error fetching subscription:', subError);
          }
          
          if (subscription) {
            setPlanCode(payment.plan_code || '');
            setVerificationStatus('success');
            triggerConfetti();
            toast.success('Payment Successful!', {
              description: `Your ${payment.plan_code?.includes('premium') ? 'Premium' : 'Pro'} plan is now active. Welcome aboard!`,
              duration: 5000,
            });
            return;
          }
        } else if (payment?.status === 'failed') {
          setVerificationStatus('failed');
          setTimeout(() => {
            navigate(`/payment-failed?reason=payment_failed&reference=${ref}`);
          }, 2000);
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error('Verification attempt error:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Timeout - try fallback activation
    console.log('[PaymentSuccess] Polling timed out, attempting fallback activation...');
    const fallbackSuccess = await activateSubscriptionFallback(ref);
    
    if (fallbackSuccess) {
      // Verify the subscription is now active
      const { data: subscription } = await (supabase as any)
        .from('billing_subscriptions')
        .select('*, billing_payments!inner(plan_code)')
        .eq('user_id', user!.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subscription) {
        setPlanCode(subscription.billing_payments?.plan_code || subscription.plan_code || '');
        setVerificationStatus('success');
        triggerConfetti();
        toast.success('Payment Successful!', {
          description: 'Your subscription is now active. Welcome aboard!',
          duration: 5000,
        });
        return;
      }
    }
    
    // If fallback also fails, show timeout state
    setVerificationStatus('timeout');
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#10b981', '#059669']
      });
      
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#10b981', '#059669']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  };

  const handleReturnToDashboard = () => {
    if (isLandlord) {
      navigate('/enhancedlandlorddashboard');
    } else {
      navigate('/enhancedtenantdashboard');
    }
  };

  const handleRetryActivation = async () => {
    if (!reference) return;
    
    setVerificationStatus('loading');
    const success = await activateSubscriptionFallback(reference);
    
    if (success) {
      setVerificationStatus('success');
      triggerConfetti();
      toast.success('Subscription activated!');
    } else {
      setVerificationStatus('timeout');
      toast.error('Activation failed. Please contact support.');
    }
  };

  // Loading state
  if (verificationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <CardTitle className="text-2xl">Verifying Your Payment...</CardTitle>
            <CardDescription>
              Please wait while we confirm your payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              This usually takes just a few seconds
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Timeout state
  if (verificationStatus === 'timeout') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-yellow-100 rounded-full w-fit">
              <AlertCircle className="h-12 w-12 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Payment Processing</CardTitle>
            <CardDescription>
              Your payment is taking longer than expected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              Don't worry! Your payment may still be processing. You can try activating your subscription manually or check back in a few minutes.
            </div>
            
            {reference && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="font-mono text-sm font-medium">{reference}</p>
              </div>
            )}

            <Button 
              onClick={handleRetryActivation}
              className="w-full flex items-center gap-2"
              variant="default"
            >
              Try Activating Now
            </Button>

            <Button 
              onClick={handleReturnToDashboard}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>

            <div className="text-xs text-muted-foreground">
              Need help? Email support@mzanzihomes.com
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-800">Payment Successful! 🎉</CardTitle>
          <CardDescription>
            Your subscription has been activated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reference && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <p className="font-mono text-sm font-medium">{reference}</p>
            </div>
          )}

          {planCode && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm font-medium">
                You're now on the{' '}
                <span className="text-primary font-bold">
                  {planCode.includes('premium') ? 'Premium' : 'Pro'}
                </span>{' '}
                plan
              </p>
            </div>
          )}
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✅ Your payment has been confirmed</p>
            <p>✅ Your subscription is now active</p>
            <p>✅ You'll receive a confirmation email shortly</p>
          </div>

          <Button 
            onClick={handleReturnToDashboard}
            className="w-full flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

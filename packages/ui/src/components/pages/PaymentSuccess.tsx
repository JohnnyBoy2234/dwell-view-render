import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { CheckCircle, Home, Loader2, AlertCircle, Receipt } from 'lucide-react';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

type VerificationStatus = 'loading' | 'success' | 'pending' | 'timeout' | 'failed';

interface PaidBill {
  id: string;
  period?: string;
  total_amount?: number;
  property?: string;
}

const TENANT_POP_ROUTE = '/tenant/proof-of-payment';
const fmtR = (n?: number) =>
  typeof n === 'number'
    ? new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)
    : '';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const [reference] = useState(searchParams.get('reference'));
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [planCode, setPlanCode] = useState<string>('');
  const [paidBill, setPaidBill] = useState<PaidBill | null>(null);

  const isRentBill = !!reference && reference.startsWith('BILL_');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (reference) {
      if (reference.startsWith('BILL_')) {
        verifyBillPayment(reference);
      } else {
        verifyPayment(reference);
      }
    } else {
      // If no reference, assume success (legacy behavior)
      setVerificationStatus('success');
      triggerConfetti();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, reference]);

  // ── Rent bill verification (server-side, webhook-independent) ─────────────
  const verifyBillPayment = async (ref: string) => {
    const maxAttempts = 10; // ~30s at 3s intervals
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke('verify-bill-payment', {
          body: { reference: ref },
        });

        if (error) {
          console.error('[PaymentSuccess] verify-bill-payment error:', error);
        } else if (data?.success && data.status === 'paid') {
          setPaidBill({
            id: data.bill?.id,
            period: data.bill?.period,
            total_amount: data.bill?.total_amount,
            property: data.bill?.property,
          });
          setVerificationStatus('success');
          triggerConfetti();
          toast.success('Payment successful!', {
            description: 'Your receipt is saved in your POP section.',
            duration: 5000,
          });
          return;
        }
        // status === 'pending' → keep polling
      } catch (err) {
        console.error('[PaymentSuccess] verify-bill-payment exception:', err);
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    setVerificationStatus('timeout');
  };

  // ── Legacy subscription verification (being replaced by another branch) ───
  const activateSubscriptionFallback = async (ref: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('activate-subscription', {
        body: { reference: ref },
      });
      if (error) {
        console.error('[PaymentSuccess] Fallback activation error:', error);
        return false;
      }
      return !!data?.success;
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
        const { data: payment, error: paymentError } = await (supabase as any)
          .from('billing_payments')
          .select('status, plan_code')
          .eq('reference', ref)
          .maybeSingle();

        if (paymentError) {
          console.error('Error fetching payment:', paymentError);
        }

        if (payment?.status === 'complete') {
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
    const fallbackSuccess = await activateSubscriptionFallback(ref);

    if (fallbackSuccess) {
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

  const flagRentPaid = () => {
    localStorage.setItem('rentJustPaid', '1');
    // The RentDueBanner is mounted at the app root and won't remount on SPA nav,
    // so nudge it to flash green.
    try { window.dispatchEvent(new Event('rent-just-paid')); } catch { /* noop */ }
  };

  const handleReturnToDashboard = () => {
    if (isRentBill) flagRentPaid();
    if (isLandlord) {
      navigate('/enhancedlandlorddashboard');
    } else {
      navigate('/enhancedtenantdashboard');
    }
  };

  const handleViewPop = () => {
    if (isRentBill) flagRentPaid();
    navigate(TENANT_POP_ROUTE);
  };

  const handleRetryActivation = async () => {
    if (!reference) return;

    setVerificationStatus('loading');

    // Rent bills re-verify server-side; never call activate-subscription.
    if (isRentBill) {
      await verifyBillPayment(reference);
      return;
    }

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
            <CardTitle className="text-2xl">
              {isRentBill ? 'Confirming your payment…' : 'Verifying Your Payment...'}
            </CardTitle>
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
              {isRentBill
                ? "Don't worry — your payment may still be processing. Tap below to check again, or head to your dashboard and check back shortly."
                : "Don't worry! Your payment may still be processing. You can try activating your subscription manually or check back in a few minutes."}
            </div>

            {reference && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="font-mono text-sm font-medium break-all">{reference}</p>
              </div>
            )}

            <Button
              onClick={handleRetryActivation}
              className="w-full flex items-center gap-2"
              variant="default"
            >
              {isRentBill ? 'Check again' : 'Try Activating Now'}
            </Button>

            <Button
              onClick={handleReturnToDashboard}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              <Home className="h-4 w-4" />
              {isRentBill ? 'Go to Dashboard' : 'Return to Dashboard'}
            </Button>

            <div className="text-xs text-muted-foreground">
              Need help? Email support@mzanzihomes.com
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state — rent bill
  if (isRentBill) {
    const monthLabel = paidBill?.period
      ? new Date(`${paidBill.period}-01`).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })
      : '';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Payment successful 🎉</CardTitle>
            <CardDescription>
              Your receipt is in your POP (Proof of Payment) section.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(monthLabel || typeof paidBill?.total_amount === 'number') && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-left space-y-1">
                {monthLabel && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Period: </span>
                    <span className="font-medium text-foreground">{monthLabel}</span>
                  </p>
                )}
                {typeof paidBill?.total_amount === 'number' && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Amount: </span>
                    <span className="font-semibold text-green-700">{fmtR(paidBill.total_amount)}</span>
                  </p>
                )}
                {paidBill?.property && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Property: </span>
                    <span className="font-medium text-foreground">{paidBill.property}</span>
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✅ Your payment has been confirmed</p>
              <p>✅ A receipt has been saved to your POP</p>
              <p>✅ Your landlord has been notified</p>
            </div>

            <Button onClick={handleViewPop} className="w-full flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              View my POP
            </Button>

            <Button
              onClick={handleReturnToDashboard}
              variant="outline"
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

  // Success state — legacy subscription
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
              <p className="font-mono text-sm font-medium break-all">{reference}</p>
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

import { useEffect, useRef, useState } from 'react';
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

// ── Face ID-style verification animation ──────────────────────────────────
// Sequence: face glyph pulses while verifying → morphs into a drawn checkmark
// with a springy pop → holds → shrinks away, then the success card fades up.
type CelebrationPhase = 'idle' | 'morph' | 'exit' | 'done';

const MORPH_MS = 750; // face-out + circle sweep + check draw + pop
const HOLD_MS = 1800; // how long the checkmark lingers
const EXIT_MS = 400; // shrink + fade away
const CONFETTI_AT_MS = 450; // fire confetti right as the check pops

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);

const FACEID_CSS = `
.faceid-wrap{display:flex;align-items:center;justify-content:center;}
.faceid-svg{overflow:visible;}
@keyframes faceid-scan{0%,100%{opacity:.9;transform:scale(1);}50%{opacity:.4;transform:scale(.965);}}
.faceid-scanning .faceid-face{animation:faceid-scan 1.6s ease-in-out infinite;transform-origin:center;transform-box:fill-box;}
@keyframes faceid-face-out{to{opacity:0;transform:scale(.55);}}
.faceid-morph .faceid-face{animation:faceid-face-out .25s ease-in forwards;transform-origin:center;transform-box:fill-box;}
@keyframes faceid-pop{0%{opacity:0;transform:scale(.6);}60%{opacity:1;transform:scale(1.08);}100%{opacity:1;transform:scale(1);}}
.faceid-check{animation:faceid-pop .6s cubic-bezier(.34,1.56,.64,1) .1s both;transform-origin:center;transform-box:fill-box;}
@keyframes faceid-draw{to{stroke-dashoffset:0;}}
.faceid-check-circle{stroke-dasharray:189;stroke-dashoffset:189;animation:faceid-draw .45s cubic-bezier(.65,0,.35,1) .15s forwards;}
.faceid-check-path{stroke-dasharray:44;stroke-dashoffset:44;animation:faceid-draw .3s cubic-bezier(.65,0,.35,1) .32s forwards;}
.faceid-stage{display:flex;flex-direction:column;align-items:center;}
@keyframes faceid-exit{to{opacity:0;transform:scale(.5);}}
.faceid-stage-exit{animation:faceid-exit .4s ease-in forwards;}
@keyframes faceid-fade-up{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
.faceid-content-in{animation:faceid-fade-up .45s cubic-bezier(.16,1,.3,1) both;}
@keyframes faceid-caption-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.faceid-caption{animation:faceid-caption-in .4s ease-out .5s both;}
@media (prefers-reduced-motion:reduce){
  .faceid-scanning .faceid-face,.faceid-morph .faceid-face,.faceid-check,.faceid-check-circle,.faceid-check-path,.faceid-stage-exit,.faceid-content-in,.faceid-caption{animation:none !important;}
  .faceid-check-circle,.faceid-check-path{stroke-dashoffset:0;}
  .faceid-morph .faceid-face{opacity:0;}
  .faceid-check{opacity:1;}
}
`;

const FaceIdStyles = () => <style>{FACEID_CSS}</style>;

/**
 * iOS Face ID-style glyph. `scanning` shows the pulsing face inside the
 * corner-bracket frame; `morph` fades the face out while a green circle
 * sweeps in and the check stroke draws itself with a springy pop.
 */
function FaceIdGlyph({ phase }: { phase: 'scanning' | 'morph' }) {
  return (
    <div
      className={`faceid-wrap faceid-${phase}`}
      role="status"
      aria-label={phase === 'scanning' ? 'Verifying payment' : 'Payment verified'}
    >
      <svg
        className="faceid-svg"
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
      >
        <g
          className="faceid-face text-foreground/80"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Face ID corner brackets */}
          <path d="M8 30 V26 C8 16.06 16.06 8 26 8 H30" />
          <path d="M66 8 H70 C79.94 8 88 16.06 88 26 V30" />
          <path d="M88 66 V70 C88 79.94 79.94 88 70 88 H66" />
          <path d="M30 88 H26 C16.06 88 8 79.94 8 70 V66" />
          {/* Eyes */}
          <path d="M34 36 V44" />
          <path d="M62 36 V44" />
          {/* Smile */}
          <path d="M33 58 C37 65 42 68 48 68 C54 68 59 65 63 58" />
        </g>
        {phase === 'morph' && (
          <g
            className="faceid-check text-green-600"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle className="faceid-check-circle" cx="48" cy="48" r="30" transform="rotate(-90 48 48)" />
            <path className="faceid-check-path" d="M34 49 L44 59 L63 38" />
          </g>
        )}
      </svg>
      <FaceIdStyles />
    </div>
  );
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLandlord } = useAuth();
  const [reference] = useState(searchParams.get('reference'));
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('loading');
  const [planCode, setPlanCode] = useState<string>('');
  const [paidBill, setPaidBill] = useState<PaidBill | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPhase>('idle');
  const celebrationTimers = useRef<number[]>([]);

  const isRentBill = !!reference && reference.startsWith('BILL_');

  useEffect(() => {
    const timers = celebrationTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Face → checkmark → gone, then the success content takes over.
  const startCelebration = () => {
    if (prefersReducedMotion()) {
      setCelebration('done');
      triggerConfetti();
      return;
    }
    setCelebration('morph');
    celebrationTimers.current.push(
      window.setTimeout(triggerConfetti, CONFETTI_AT_MS),
      window.setTimeout(() => setCelebration('exit'), MORPH_MS + HOLD_MS),
      window.setTimeout(() => setCelebration('done'), MORPH_MS + HOLD_MS + EXIT_MS),
    );
  };

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
          startCelebration();
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
            {isRentBill ? (
              <div className="mx-auto mb-4">
                <FaceIdGlyph phase="scanning" />
              </div>
            ) : (
              <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            )}
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

  // Celebration interstitial — Face ID-style face → checkmark, then it goes away
  if (isRentBill && (celebration === 'morph' || celebration === 'exit')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className={`faceid-stage ${celebration === 'exit' ? 'faceid-stage-exit' : ''}`}>
          <FaceIdGlyph phase="morph" />
          <p className="faceid-caption mt-6 text-lg font-semibold text-foreground">
            Payment successful
          </p>
        </div>
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
        <FaceIdStyles />
        <Card className="max-w-md w-full text-center faceid-content-in">
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

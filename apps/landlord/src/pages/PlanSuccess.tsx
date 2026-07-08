import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';

export default function PlanSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property');
  const { isSubscriber, refresh } = useSubscription();
  const [confirmed, setConfirmed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // The webhook confirms asynchronously; poll a few times so the page can flip
  // from "activating" to "done" without a manual reload.
  useEffect(() => {
    if (isSubscriber || propertyId) { setConfirmed(true); return; }
    let attempts = 0;
    const t = setInterval(() => {
      attempts += 1;
      refresh();
      if (attempts >= 10) {
        clearInterval(t);
        setTimedOut(true);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [isSubscriber, propertyId, refresh]);

  const done = confirmed || isSubscriber;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-xl border border-border p-6 max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          {done
            ? <CheckCircle2 className="w-8 h-8 text-success" />
            : <Loader2 className="w-8 h-8 text-success animate-spin" />}
        </div>
        <h1 className="text-xl font-bold mb-1">
          {done
            ? 'Payment received!'
            : timedOut
              ? 'Still confirming…'
              : 'Confirming your payment…'}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {propertyId
            ? 'Your listing is being published — it will be live in a moment.'
            : done
              ? 'Your subscription is active. All landlord tools are unlocked.'
              : timedOut
                ? 'Your payment is safe — activation can take a minute. You can head to your dashboard; your tools will unlock automatically.'
                : 'This usually takes a few seconds.'}
        </p>
        <Button className="w-full rounded-xl" onClick={() => navigate('/enhancedlandlorddashboard')}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

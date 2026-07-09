import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { Check, Sparkles, Tag, Loader2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

const SUBSCRIBER_FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, screening & leases with e-signing',
  'Rent collection with Paystack + receipts',
  'SwiftBooks accounting & analytics',
  'Maintenance requests & inspections',
];

const LISTING_FEATURES = [
  'Your listing live until rented',
  'Interested tenants send you their contact details',
  'You arrange viewings and paperwork directly',
  'Upgrade to the subscription any time',
];

export default function Pricing() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToAuth = (returnTo: string) => {
    sessionStorage.setItem('returnTo', returnTo);
    navigate('/auth');
  };

  const subscribe = async () => {
    setStarting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { goToAuth('/pricing'); return; }
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose: 'subscription' },
      });
      if (fnErr) {
        // On non-2xx responses fnErr.message is a generic status message; the
        // real reason is in the body.
        const body = await (fnErr as any).context?.json?.().catch(() => null);
        throw new Error(body?.error || fnErr.message);
      }
      if (!data?.success || !data?.authorization_url) throw new Error(data?.error || 'Could not start checkout');
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Simple pricing for landlords</h1>
        <p className="text-muted-foreground">
          Subscribe for the full toolkit, or pay once per listing. Tenants always use MzanziHomes free.
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-4">
        {/* Subscription */}
        <div className="rounded-3xl border-2 border-primary bg-card p-6 shadow-sm relative">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase tracking-wide bg-primary text-primary-foreground rounded-full px-3 py-1">
            Recommended
          </span>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Subscription</h2>
          </div>
          <p className="text-3xl font-extrabold mb-4">R149<span className="text-sm font-medium text-muted-foreground">/month</span></p>
          <ul className="space-y-2 mb-6">
            {SUBSCRIBER_FEATURES.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          <Button className="w-full rounded-xl h-11" disabled={starting} onClick={subscribe}>
            {starting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</> : 'Subscribe now'}
          </Button>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </div>

        {/* Pay per listing */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-bold text-lg">Pay per listing</h2>
          </div>
          <p className="text-3xl font-extrabold mb-4">R99<span className="text-sm font-medium text-muted-foreground"> once-off</span></p>
          <ul className="space-y-2 mb-6">
            {LISTING_FEATURES.map((f) => (
              <li key={f} className="text-sm flex items-start gap-2">
                <Check className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /> {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => goToAuth('/list-property')}>
            List a property
          </Button>
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            You pay when you publish the listing.
          </p>
        </div>
      </div>
    </div>
  );
}

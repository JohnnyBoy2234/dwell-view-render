import { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Lock, Sparkles, Loader2, Check } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';

const FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, leases & e-signing',
  'Rent collection & payments',
  'SwiftBooks accounting & analytics',
  'Maintenance & inspections',
];

interface UpgradePromptProps {
  featureName?: string;
}

export function UpgradePrompt({ featureName }: UpgradePromptProps) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = async () => {
    setStarting(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose: 'subscription' },
      });
      if (fnErr) {
        // On non-2xx responses fnErr.message is a generic status message; the
        // real reason is in the server's { error } body.
        const body = await (fnErr as any).context?.json?.().catch(() => null);
        throw new Error(body?.error || fnErr.message);
      }
      if (!data?.success || !data?.authorization_url) {
        throw new Error(data?.error || 'Could not start checkout');
      }
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6 max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-1">
          {featureName ? `${featureName} is a subscriber tool` : 'Subscribers only'}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Get the full landlord toolkit for R149/month.
        </p>
        <ul className="text-left space-y-1.5 mb-5">
          {FEATURES.map((f) => (
            <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
              <Check className="w-4 h-4 text-primary shrink-0" /> {f}
            </li>
          ))}
        </ul>
        <Button className="w-full rounded-xl h-11" disabled={starting} onClick={subscribe}>
          {starting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Subscribe — R149/month</>}
        </Button>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { openCheckoutUrl } from '@mzanzihomes/ui/utils/nativeBrowser';

export type CheckoutPurpose = 'subscription' | 'listing_fee';

export function usePlanCheckout() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (purpose: CheckoutPurpose, propertyId?: string) => {
    setStarting(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('initialize-plan-checkout', {
        body: { purpose, property_id: propertyId },
      });
      if (fnErr) {
        // On non-2xx responses fnErr.message is a generic status message; the
        // real reason (e.g. "This listing is already paid for") is in the body.
        const body = await (fnErr as any).context?.json?.().catch(() => null);
        throw new Error(body?.error || fnErr.message);
      }
      if (!data?.success || !data?.authorization_url) {
        throw new Error(data?.error || 'Could not start checkout');
      }
      // Web: full-page redirect. Native: in-app browser, then refresh on return
      // so the webhook-confirmed subscription/listing state shows.
      const outcome = await openCheckoutUrl(data.authorization_url);
      if (outcome === 'closed') window.location.reload();
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  const reset = () => {
    setError(null);
    setStarting(false);
  };

  return { startCheckout, starting, error, reset };
}

import { useState } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';

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
      if (fnErr) throw fnErr;
      if (!data?.success || !data?.authorization_url) {
        throw new Error(data?.error || 'Could not start checkout');
      }
      window.location.href = data.authorization_url;
    } catch (e: any) {
      setError(e.message || 'Could not start checkout');
      setStarting(false);
    }
  };

  return { startCheckout, starting, error };
}

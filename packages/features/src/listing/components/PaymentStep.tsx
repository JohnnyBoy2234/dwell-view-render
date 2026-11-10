import * as React from 'react';
import { Loader2, Sparkles, Tag, CheckCircle2 } from 'lucide-react';
import { usePlanCheckout } from '../../billing/hooks/usePlanCheckout';

interface PaymentStepProps {
  propertyId: string | null;
  isSubscriber: boolean;
}

export default function PaymentStep({ propertyId, isSubscriber }: PaymentStepProps) {
  const { startCheckout, starting, error } = usePlanCheckout();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Choose how to publish</h2>
        <p className="text-muted-foreground">
          Subscribe for unlimited listings, or pay once-off for just this one.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        {isSubscriber ? (
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">You're already subscribed.</p>
              <p className="text-sm text-muted-foreground">
                Unlimited listings are included in your plan — nothing more to pay for this one.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Subscription — recommended */}
            <button
              type="button"
              className="w-full text-left rounded-2xl border-2 border-primary bg-primary/5 p-4 disabled:opacity-60"
              disabled={starting || !propertyId}
              onClick={() => propertyId && startCheckout('subscription', propertyId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Subscribe — R149/month</p>
                  <p className="text-xs text-muted-foreground">
                    Unlimited listings + all management tools: messaging, applications,
                    leases, rent collection, SwiftBooks and more.
                  </p>
                </div>
              </div>
            </button>

            {/* Once-off listing fee */}
            <button
              type="button"
              className="w-full text-left rounded-2xl border border-border p-4 disabled:opacity-60"
              disabled={starting || !propertyId}
              onClick={() => propertyId && startCheckout('listing_fee', propertyId)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Pay per listing — R99 once-off</p>
                  <p className="text-xs text-muted-foreground">
                    This listing goes live and stays live. Interested tenants send you
                    their contact details — you contact them directly.
                  </p>
                </div>
              </div>
            </button>

            {starting && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Opening secure checkout…
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-[11px] text-muted-foreground text-center">
              Secure payment by Paystack.
            </p>
          </>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          You can also continue without paying now — we'll ask again when you try to publish.
        </p>
      </div>
    </div>
  );
}

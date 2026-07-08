import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Loader2, Sparkles, Tag } from 'lucide-react';
import { usePlanCheckout } from '../hooks/usePlanCheckout';

interface PublishPaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
}

export function PublishPaywallSheet({ open, onOpenChange, propertyId }: PublishPaywallSheetProps) {
  const { startCheckout, starting, error, reset } = usePlanCheckout();

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Publish your listing</SheetTitle>
          <SheetDescription>
            Your property is saved as a draft. Choose how you want to go live.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4 pb-4">
          {/* Subscription — recommended */}
          <button
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
            Secure payment by Paystack. Your draft is saved either way.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

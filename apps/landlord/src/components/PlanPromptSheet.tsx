import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Loader2, Sparkles, Tag, Check } from 'lucide-react';
import { usePlanCheckout } from '@mzanzihomes/features/billing';

const SUBSCRIBER_FEATURES = [
  'Unlimited live listings',
  'In-app messaging with tenants',
  'Applications, leases & e-signing',
  'Rent collection & payments',
  'SwiftBooks accounting & analytics',
  'Maintenance & inspections',
];

interface PlanPromptSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlanPromptSheet({ open, onOpenChange }: PlanPromptSheetProps) {
  const { startCheckout, starting, error, reset } = usePlanCheckout();

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-w-lg mx-auto max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Choose how you want to use MzanziHomes</SheetTitle>
          <SheetDescription>
            Subscribe for the full toolkit, or pay per listing and manage things your own way.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 mt-4 pb-4">
          <div className="rounded-2xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="font-semibold">Subscription — R149/month</p>
            </div>
            <ul className="space-y-1 mb-3">
              {SUBSCRIBER_FEATURES.map((f) => (
                <li key={f} className="text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="w-3 h-3 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full rounded-xl" disabled={starting} onClick={() => startCheckout('subscription')}>
              {starting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening secure checkout…
                </>
              ) : (
                'Subscribe now'
              )}
            </Button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold">Pay per listing — R99 once-off</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Each listing goes live for a once-off R99. Tenants send you their contact
              details and you take it from there. You can subscribe any time.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>
              Continue free — pay when I publish
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Lock, Sparkles } from 'lucide-react';
import { usePlanCheckout } from '@mzanzihomes/features/billing';

interface SubscribeGateDialogProps {
  featureName: string | null; // null = closed
  onClose: () => void;
}

export function SubscribeGateDialog({ featureName, onClose }: SubscribeGateDialogProps) {
  const { startCheckout, starting, error } = usePlanCheckout();

  return (
    <Dialog open={featureName !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{featureName} is a subscriber tool</DialogTitle>
          <DialogDescription className="text-center">
            Unlock {featureName?.toLowerCase()} and every other management tool —
            messaging, leases, rent collection, SwiftBooks — for R149/month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button className="w-full rounded-xl" disabled={starting} onClick={() => startCheckout('subscription')}>
            <Sparkles className="w-4 h-4 mr-2" /> Subscribe — R149/month
          </Button>
          <Button variant="ghost" className="w-full rounded-xl" onClick={onClose}>
            Not now
          </Button>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

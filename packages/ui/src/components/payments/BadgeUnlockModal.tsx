import { Dialog, DialogContent } from "@mzanzihomes/ui/components/dialog";
import { Button } from "@mzanzihomes/ui/components/button";
import { Award, Star } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface BadgeUnlockModalProps {
  open: boolean;
  onClose: () => void;
  badgeYear: number;
  starsCount: number;
}

export default function BadgeUnlockModal({
  open,
  onClose,
  badgeYear,
  starsCount
}: BadgeUnlockModalProps) {
  
  useEffect(() => {
    if (open) {
      // Trigger more intense confetti for badge unlock
      const duration = 3000;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B']
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#FFD700', '#FFA500', '#FF6B6B']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center py-6 space-y-6">
          {/* Badge animation */}
          <div className="relative">
            <div className="absolute inset-0 animate-pulse">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 opacity-20" />
            </div>
            <div className="relative z-10 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center shadow-2xl">
              <Award className="h-16 w-16 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
              {badgeYear}
            </div>
          </div>

          {/* Celebration message */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Badge Unlocked!
            </h2>
            <h3 className="text-xl font-semibold text-foreground">
              Reliable Tenant {badgeYear}
            </h3>
            <p className="text-muted-foreground">
              You earned {starsCount} golden stars this year!
            </p>
          </div>

          {/* Achievement details */}
          <div className="w-full bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
              <Star className="h-5 w-5 fill-current" />
            </div>
            <p className="text-sm font-medium text-foreground">
              This badge will appear next to your name on:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Your tenant profile</li>
              <li>✓ All rental applications</li>
              <li>✓ Messages with landlords</li>
              <li>✓ Payment history</li>
            </ul>
            <p className="text-xs text-muted-foreground italic pt-2">
              Landlords love reliable tenants!
            </p>
          </div>

          {/* Close button */}
          <Button onClick={onClose} size="lg" className="w-full">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

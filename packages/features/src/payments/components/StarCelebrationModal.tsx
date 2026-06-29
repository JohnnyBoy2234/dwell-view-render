import { Dialog, DialogContent } from "@mzanzihomes/ui/components/dialog";
import { Button } from "@mzanzihomes/ui/components/button";
import { Star, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface StarCelebrationModalProps {
  open: boolean;
  onClose: () => void;
  wasEarly: boolean;
  daysEarly?: number;
  currentStars: number;
  totalStarsNeeded: number;
}

export default function StarCelebrationModal({
  open,
  onClose,
  wasEarly,
  daysEarly = 0,
  currentStars,
  totalStarsNeeded
}: StarCelebrationModalProps) {
  
  useEffect(() => {
    if (open) {
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6B6B']
      });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center py-6 space-y-4">
          {/* Star animation */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Star className="h-24 w-24 text-yellow-400 fill-yellow-400 opacity-75" />
            </div>
            <Star className="h-24 w-24 text-yellow-400 fill-yellow-400 relative z-10" />
            <Sparkles className="h-8 w-8 text-yellow-300 absolute -top-2 -right-2 animate-pulse" />
          </div>

          {/* Celebration message */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              🎉 Golden Star Earned!
            </h2>
            <p className="text-lg text-muted-foreground">
              {wasEarly 
                ? `You paid ${daysEarly} day${daysEarly !== 1 ? 's' : ''} early!`
                : 'You paid on time!'}
            </p>
          </div>

          {/* Progress */}
          <div className="w-full bg-muted/30 rounded-full p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progress to Badge</span>
              <span className="text-sm font-bold text-primary">
                {currentStars}/{totalStarsNeeded} ⭐
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(currentStars / totalStarsNeeded) * 100}%` }}
              />
            </div>
            {currentStars === totalStarsNeeded && (
              <p className="text-sm text-green-600 font-semibold mt-2 animate-pulse">
                🏆 Badge unlocked! Check your profile
              </p>
            )}
          </div>

          {/* Close button */}
          <Button onClick={onClose} size="lg" className="w-full">
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

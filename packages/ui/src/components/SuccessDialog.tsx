import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { 
  CheckCircle, 
  Send, 
  Home, 
  User, 
  FileText, 
  Key, 
  Star,
  Calendar,
  Wrench,
  ArrowRight
} from 'lucide-react';
import { cn } from '@mzanzihomes/common/lib/utils';
import confetti from 'canvas-confetti';

export interface SuccessDialogStep {
  title: string;
  description: string;
}

export interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  icon: 'check' | 'send' | 'home' | 'user' | 'file' | 'key' | 'star' | 'calendar' | 'wrench';
  title: string;
  subtitle?: string;
  progress?: { 
    current: number; 
    total: number; 
    label: string;
  };
  nextSteps: SuccessDialogStep[];
  primaryAction: { 
    label: string; 
    onClick: () => void;
  };
  secondaryAction?: { 
    label: string; 
    onClick: () => void;
  };
  showConfetti?: boolean;
}

const iconMap = {
  check: CheckCircle,
  send: Send,
  home: Home,
  user: User,
  file: FileText,
  key: Key,
  star: Star,
  calendar: Calendar,
  wrench: Wrench,
};

const iconColorMap = {
  check: 'text-green-600 bg-green-100',
  send: 'text-blue-600 bg-blue-100',
  home: 'text-primary bg-primary/10',
  user: 'text-violet-600 bg-violet-100',
  file: 'text-amber-600 bg-amber-100',
  key: 'text-primary bg-primary/10',
  star: 'text-yellow-500 bg-yellow-100',
  calendar: 'text-cyan-600 bg-cyan-100',
  wrench: 'text-orange-600 bg-orange-100',
};

export function SuccessDialog({
  open,
  onClose,
  icon,
  title,
  subtitle,
  progress,
  nextSteps,
  primaryAction,
  secondaryAction,
  showConfetti = false
}: SuccessDialogProps) {
  const [hasTriggeredConfetti, setHasTriggeredConfetti] = useState(false);
  const IconComponent = iconMap[icon];

  useEffect(() => {
    if (open && showConfetti && !hasTriggeredConfetti) {
      setHasTriggeredConfetti(true);
      // Trigger confetti animation
      const duration = 2000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'],
        });
      }, 50);

      return () => clearInterval(interval);
    }
  }, [open, showConfetti, hasTriggeredConfetti]);

  // Reset confetti trigger when dialog closes
  useEffect(() => {
    if (!open) {
      setHasTriggeredConfetti(false);
    }
  }, [open]);

  const progressPercentage = progress 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-h-[calc(100vh-2rem)] p-0 overflow-hidden rounded-xl">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6 text-center">
          {/* Animated Icon */}
          <div className="relative inline-flex">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center animate-scale-in",
              iconColorMap[icon]
            )}>
              <IconComponent className="h-10 w-10" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" />
          </div>

          {/* Title */}
          <h2 className="mt-4 text-2xl font-bold text-foreground animate-fade-in">
            {title}
          </h2>
          
          {subtitle && (
            <p className="mt-2 text-muted-foreground animate-fade-in">
              {subtitle}
            </p>
          )}

          {/* Progress Bar */}
          {progress && (
            <div className="mt-4 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.label}</span>
                <span className="font-medium text-primary">
                  {progress.current} of {progress.total}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {progressPercentage}% complete
              </p>
            </div>
          )}
        </div>

        {/* What's Next Section */}
        <div className="p-6 space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            What's Next
          </h3>
          
          <div className="space-y-3">
            {nextSteps.map((step, index) => (
              <div 
                key={index}
                className="flex gap-3 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <Button 
              onClick={primaryAction.onClick}
              className="w-full"
              size="lg"
            >
              {primaryAction.label}
            </Button>
            
            {secondaryAction && (
              <Button 
                onClick={secondaryAction.onClick}
                variant="outline"
                className="w-full"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

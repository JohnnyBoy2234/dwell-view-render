import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import { Button } from '@mzanzihomes/ui/components/button';
import { Check, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PlanType } from '@mzanzihomes/supabase/hooks/useSubscription';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredPlan: PlanType;
  currentPlan: PlanType;
  featureName?: string;
}

const PLAN_FEATURES = {
  pro: [
    'Unlimited property listings',
    'In-platform messaging',
    'Tenant applications',
    'Inventory tracker',
    'Property inspections',
    'Lease management & signatures',
  ],
  premium: [
    'Everything in Pro, plus:',
    'Maintenance management',
    'SwiftBooks & Analytics',
    'Concierge services',
    'VIP support',
    'Priority assistance',
  ],
};

const PLAN_LABELS = {
  free: 'Basic',
  pro: 'Pro',
  premium: 'Premium',
};

export function UpgradePrompt({ 
  open, 
  onOpenChange, 
  requiredPlan, 
  currentPlan,
  featureName 
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate(`/pricing?plan=${requiredPlan}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Upgrade to {PLAN_LABELS[requiredPlan]}
          </DialogTitle>
          <DialogDescription className="text-center">
            {featureName ? (
              <>Unlock <span className="font-semibold">{featureName}</span> and more with {PLAN_LABELS[requiredPlan]}</>
            ) : (
              <>This feature requires a {PLAN_LABELS[requiredPlan]} subscription</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold">What you'll get:</p>
            </div>
            <ul className="space-y-2">
              {PLAN_FEATURES[requiredPlan as 'pro' | 'premium']?.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-semibold">Current plan:</span> {PLAN_LABELS[currentPlan]}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="flex-1">
            Upgrade Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

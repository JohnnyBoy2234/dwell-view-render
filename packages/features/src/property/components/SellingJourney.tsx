import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, Key, ArrowRight } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Link } from 'react-router-dom';
import { SELLING_STEPS, SELLING_PHASES, SellingStep } from '@mzanzihomes/common/data/sellingSteps';
import { SellingStepDialog } from './SellingStepDialog';

interface JourneyProgress {
  completedSteps: boolean[];
  updatedAt: string;
}

function loadProgress(propertyId: string): boolean[] {
  try {
    const raw = localStorage.getItem(`selling-journey-${propertyId}`);
    if (!raw) return Array(SELLING_STEPS.length).fill(false);
    const parsed: JourneyProgress = JSON.parse(raw);
    return parsed.completedSteps ?? Array(SELLING_STEPS.length).fill(false);
  } catch {
    return Array(SELLING_STEPS.length).fill(false);
  }
}

function saveProgress(propertyId: string, completedSteps: boolean[]) {
  const data: JourneyProgress = { completedSteps, updatedAt: new Date().toISOString() };
  localStorage.setItem(`selling-journey-${propertyId}`, JSON.stringify(data));
}

interface SellingJourneyProps {
  propertyId: string;
}

export function SellingJourney({ propertyId }: SellingJourneyProps) {
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(() => loadProgress(propertyId));
  const [selectedStep, setSelectedStep] = useState<SellingStep | null>(null);

  useEffect(() => {
    setCompletedSteps(loadProgress(propertyId));
  }, [propertyId]);

  const handleToggleComplete = (stepNumber: number, completed: boolean) => {
    setCompletedSteps((prev) => {
      const updated = [...prev];
      updated[stepNumber - 1] = completed;
      saveProgress(propertyId, updated);
      return updated;
    });
  };

  const completedCount = completedSteps.filter(Boolean).length;
  const totalSteps = SELLING_STEPS.length;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Key className="h-5 w-5 text-ocean-blue" />
              <h3 className="font-semibold text-gray-900">Selling Journey</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalSteps} steps completed
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-ocean-blue">{progressPct}%</span>
            <p className="text-xs text-muted-foreground">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-ocean-blue rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <Button asChild variant="link" size="sm" className="p-0 h-auto text-ocean-blue text-xs">
            <Link to="/about/seller">
              View full conveyancing guide
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          {completedCount === totalSteps && (
            <Badge className="bg-success-green text-white text-xs">All steps done!</Badge>
          )}
        </div>
      </div>

      {/* Steps by phase */}
      {SELLING_PHASES.map((phase) => {
        const phaseSteps = SELLING_STEPS.filter((s) => s.phase === phase);
        return (
          <div key={phase} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{phase}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {phaseSteps.map((step) => {
                const done = completedSteps[step.number - 1];
                return (
                  <button
                    key={step.number}
                    onClick={() => setSelectedStep(step)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-6 w-6 text-success-green" />
                      ) : (
                        <div className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                          <span className="text-xs text-gray-400 font-semibold">{step.number}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Step dialog */}
      <SellingStepDialog
        step={selectedStep}
        propertyId={propertyId}
        isCompleted={selectedStep ? completedSteps[selectedStep.number - 1] : false}
        onClose={() => setSelectedStep(null)}
        onToggleComplete={handleToggleComplete}
      />
    </div>
  );
}

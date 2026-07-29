// @ts-nocheck
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { toast } from 'sonner';
import { useLeaseDraft } from '../../hooks/useLeaseDraft';
import { StepWhoWhere } from './StepWhoWhere';
import { LEASE_ACCENT } from './wizardUi';

interface LeaseWizardProps {
  contractId?: string;
  propertyId?: string;
  tenantId?: string;
  onContractSaved?: (contractId: string) => void;
  onComplete?: (contractId: string) => void;
  onCancel?: () => void;
}

const STEPS = [
  { key: 'who', title: 'Who & Where', hint: 'Property & tenant' },
  { key: 'money', title: 'Money & Dates', hint: 'Rent, deposit, term' },
  { key: 'condition', title: 'Condition', hint: 'Property disclosures' },
  { key: 'review', title: 'Review & Send', hint: 'Confirm & sign off' },
];

/**
 * Essentials-first lease wizard — replaces the 10-step long form. The landlord
 * confirms autofilled essentials across 4 short steps; every legal field is
 * still captured (autofilled or SA-standard-defaulted behind Advanced panels),
 * and the generated PDF / signing pipeline is unchanged.
 *
 * Phase 1: shell + Step 1 (Who & Where). Steps 2–4 land in Phase 2.
 */
export function LeaseWizard(props: LeaseWizardProps) {
  const { contractId, propertyId, tenantId, onContractSaved, onComplete, onCancel } = props;
  const [step, setStep] = useState(0);
  const draft = useLeaseDraft({ contractId, propertyId, tenantId, onContractSaved });
  const { data, updateData, loading, saveStatus } = draft;

  const goNext = async () => {
    // Per-step validation lands with each real step; Step 1 minimal check:
    if (step === 0) {
      if (!data.propertyAddress?.trim()) return toast.error('Add the property address');
      if (!data.tenantFullName?.trim()) return toast.error("Add the tenant's full name");
      if (!data.tenantEmail?.trim()) return toast.error("Add the tenant's email");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => (step === 0 ? onCancel?.() : setStep((s) => s - 1));

  if (loading) return <div className="flex items-center justify-center p-10 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4 sm:px-6">
      {/* Stepper */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="text-[20px] font-extrabold text-slate-900">{STEPS[step].title}</h2>
            <p className="text-[13px] text-slate-500">{STEPS[step].hint}</p>
          </div>
          {saveStatus === 'error' ? (
            <span className="text-[12px] font-medium text-rose-500">Couldn't save — check connection</span>
          ) : saveStatus !== 'idle' ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{ background: i <= step ? LEASE_ACCENT : '#e5e7eb' }}
            />
          ))}
        </div>
      </div>

      {/* Step body */}
      <div className="min-h-[360px]">
        {step === 0 && (
          <StepWhoWhere
            data={data}
            onUpdate={updateData}
            propertyLocked={!!propertyId}
            onPickProperty={(id) => { window.location.href = `/lease/wizard/property/${id}`; }}
          />
        )}
        {step > 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-[14px] font-semibold text-slate-600">{STEPS[step].title}</p>
            <p className="mt-1 text-[13px] text-slate-400">Coming in the next phase.</p>
          </div>
        )}
      </div>

      {/* Sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext} style={{ background: LEASE_ACCENT }} className="text-white">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button disabled style={{ background: LEASE_ACCENT }} className="text-white opacity-60">
              Review &amp; Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

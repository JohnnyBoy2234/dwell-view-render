// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, FileText, X } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import { toast } from 'sonner';
import { useLeaseDraft } from '../../hooks/useLeaseDraft';
import { StepWhoWhere } from './StepWhoWhere';
import { StepMoneyDates } from './StepMoneyDates';
import { StepCondition } from './StepCondition';
import { StepReview } from './StepReview';
import { CONDITION_QUESTIONS } from '../../templates/conditionReportTemplate';
import { LeaseLivePreview } from './LeaseLivePreview';
import { LEASE_ACCENT } from './wizardUi';
import { SuccessDialog } from '@mzanzihomes/ui/components/SuccessDialog';

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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const draft = useLeaseDraft({ contractId, propertyId, tenantId, onContractSaved });
  const { data, updateData, loading, saveStatus, savedContractId } = draft;

  // Resume on the step the landlord left off. Persisted per-lease in
  // localStorage so leaving and reopening the wizard keeps your place.
  const stepRestored = useRef(false);
  useEffect(() => {
    if (loading || stepRestored.current) return;
    const key = savedContractId || contractId;
    if (!key) return;
    const saved = Number(localStorage.getItem(`lease_wizard_step_${key}`));
    if (Number.isFinite(saved) && saved > 0 && saved < STEPS.length) setStep(saved);
    stepRestored.current = true;
  }, [loading, savedContractId, contractId]);
  useEffect(() => {
    if (!stepRestored.current) return;
    const key = savedContractId || contractId;
    if (key) localStorage.setItem(`lease_wizard_step_${key}`, String(step));
  }, [step, savedContractId, contractId]);

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!data.propertyAddress?.trim()) return 'Add the property address';
      if (!data.tenantFullName?.trim()) return "Add the tenant's full name";
      if (!data.tenantEmail?.trim()) return "Add the tenant's email";
      if (!data.tenantIdNumber?.trim()) return "Add the tenant's ID number";
    }
    if (s === 1) {
      if (!data.leaseStartDate) return 'Choose a start date';
      if (data.leaseType === 'fixed' && !data.leaseEndDate) return 'Choose an end date';
      if (!(data.rentAmount > 0)) return 'Enter the monthly rent';
      if (!(data.depositAmount >= 0)) return 'Enter the deposit';
    }
    if (s === 2) {
      const cr = (data.conditionReport || {}) as any;
      const items = CONDITION_QUESTIONS.filter((q: any) => !q.isYearsQuestion);
      const applicable = items.filter((q: any) => (q.requiresFeature ? !!(data as any)[q.requiresFeature] : true));
      const unanswered = applicable.filter((q: any) => !cr[q.key]);
      if (unanswered.length) {
        return `Answer all ${applicable.length} condition items — ${unanswered.length} still open. Tap "No issues on any" for a clean property, then flag exceptions.`;
      }
    }
    return null;
  };

  const goNext = async () => {
    const err = validateStep(step);
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => (step === 0 ? onCancel?.() : setStep((s) => s - 1));

  // >10-year fixed leases can't be e-signed (ECTA) — computed for the guardrail.
  const leaseYears = (data.leaseType === 'fixed' && data.leaseStartDate && data.leaseEndDate)
    ? (new Date(data.leaseEndDate).getTime() - new Date(data.leaseStartDate).getTime()) / (365.25 * 24 * 3600 * 1000)
    : null;
  const termTooLong = leaseYears != null && leaseYears > 10;

  const handleSend = async () => {
    for (let s = 0; s < STEPS.length - 1; s++) {
      const err = validateStep(s);
      if (err) { setStep(s); return toast.error(err); }
    }
    if (termTooLong) { setStep(3); return; } // guardrail panel handles this
    setSending(true);
    try {
      await draft.sendToTenant();
      setSent(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send the lease');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-10 text-slate-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:flex lg:gap-6">
      {/* Left: form column */}
      <div className="min-w-0 flex-1 lg:max-w-xl">
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
            onPickProperty={(id) => {
              // Reload the current builder/wizard route with the chosen property.
              const base = window.location.pathname.replace(/\/property\/[^/]+$/, '').replace(/\/$/, '');
              window.location.href = `${base}?propertyId=${id}`;
            }}
          />
        )}
        {step === 1 && <StepMoneyDates data={data} onUpdate={updateData} />}
        {step === 2 && <StepCondition data={data} onUpdate={updateData} />}
        {step === 3 && <StepReview data={data} onUpdate={updateData} onSend={handleSend} sending={sending} termTooLong={termTooLong} />}
      </div>
      </div>

      {/* Right: live preview (desktop) */}
      <div className="hidden lg:block lg:w-[440px] lg:shrink-0">
        <div className="sticky top-4 h-[calc(100dvh-6rem)]">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Live preview</p>
          <div className="h-[calc(100%-1.5rem)]">
            <LeaseLivePreview data={data} />
          </div>
        </div>
      </div>

      {/* Mobile: floating preview button */}
      <button
        type="button"
        onClick={() => setMobilePreview(true)}
        className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold text-white shadow-lg lg:hidden"
        style={{ background: LEASE_ACCENT }}
      >
        <FileText className="h-4 w-4" /> Preview
      </button>

      {/* Mobile: full-screen preview overlay */}
      {mobilePreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <span className="text-[14px] font-bold text-slate-900">Lease preview</span>
            <button onClick={() => setMobilePreview(false)} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Close preview">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden p-3">
            <LeaseLivePreview data={data} />
          </div>
        </div>
      )}

      {/* Sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={goNext} style={{ background: LEASE_ACCENT }} className="text-white">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sent confirmation */}
      <SuccessDialog
        open={sent}
        onClose={() => { setSent(false); onComplete?.(savedContractId!); }}
        icon="send"
        title="Lease sent!"
        subtitle={`The lease has been sent to ${data.tenantEmail || 'your tenant'} to review and sign.`}
        nextSteps={[
          { title: 'Tenant reviews & signs', description: 'They receive the lease to read and sign first' },
          { title: 'You countersign', description: 'Sign it off from the Leases tab once they have' },
        ]}
        primaryAction={{ label: 'Done', onClick: () => { setSent(false); onComplete?.(savedContractId!); } }}
        showConfetti
      />
    </div>
  );
}

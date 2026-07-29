// @ts-nocheck
import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import type { LeaseWizardData, ConditionAnswer } from '@mzanzihomes/common/types/lease';
import { CONDITION_QUESTIONS } from '../../templates/conditionReportTemplate';
import { Card, Field, TextArea } from './wizardUi';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
}

/**
 * Step 3 — Condition disclosure (Annexure A), exceptions-only. Every statement
 * defaults to "no issue"; the landlord flips only the ones that ARE a problem.
 * A required comments box appears when anything is flagged. All 29 answers are
 * still captured — the fast path is just "tap what's wrong".
 */
export function StepCondition({ data, onUpdate }: Props) {
  const cr = data.conditionReport as any;

  // Skip feature-gated questions (pool/alarm) when the feature is off, matching
  // the original wizard's filter.
  const questions = CONDITION_QUESTIONS.filter((q: any) => {
    if (q.isYearsQuestion) return false; // "years resided" isn't asked in the short flow
    if (q.requiresFeature) return !!(data as any)[q.requiresFeature];
    return true;
  });

  const setAnswer = (key: string, value: ConditionAnswer | string) => {
    onUpdate({ conditionReport: { ...cr, [key]: value } });
  };
  const toggle = (key: string) => setAnswer(key, cr[key] === 'yes' ? 'no' : 'yes');

  const flagged = questions.filter((q: any) => cr[q.key] === 'yes');

  return (
    <div className="space-y-4">
      <Card
        title="Property condition"
        subtitle="Tap anything that's a problem — everything else is assumed fine"
        icon={<ClipboardCheck className="h-4 w-4" />}
      >
        <p className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] text-slate-500">
          This is your disclosure under the Property Practitioners Act. All items below are marked
          <span className="font-semibold text-slate-600"> “no issue”</span> by default. Flip any that need
          disclosing.
        </p>

        <div className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
          {questions.map((q: any) => {
            const flaggedItem = cr[q.key] === 'yes';
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => toggle(q.key)}
                className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  flaggedItem ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                    flaggedItem ? 'border-rose-400 bg-rose-500 text-white' : 'border-slate-300 text-transparent'
                  }`}
                >
                  !
                </span>
                <span className={`text-[12.5px] leading-snug ${flaggedItem ? 'text-rose-800' : 'text-slate-600'}`}>
                  {q.question}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      {flagged.length > 0 && (
        <Card title={`Details for ${flagged.length} flagged item${flagged.length > 1 ? 's' : ''}`} icon={<ClipboardCheck className="h-4 w-4" />}>
          <Field label="Describe the issues you flagged" required hint="Required — these go into the lease disclosure">
            <TextArea
              value={cr.comments || ''}
              onChange={(e) => setAnswer('comments', e.target.value)}
              placeholder="e.g. Geyser drips slightly; one remote for the gate is missing."
            />
          </Field>
        </Card>
      )}

    </div>
  );
}

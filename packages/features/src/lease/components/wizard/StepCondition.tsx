// @ts-nocheck
import React, { useEffect, useMemo, useRef } from 'react';
import { ClipboardCheck, CheckCircle2, ArrowDown } from 'lucide-react';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { CONDITION_QUESTIONS } from '../../templates/conditionReportTemplate';
import { Card, Field, TextArea, TextInput, LEASE_ACCENT } from './wizardUi';
import { ConditionToggle } from './ConditionToggle';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
}

/**
 * Step 3 — Condition disclosure (Annexure A) under the Property Practitioners
 * Act §67. Statutorily complete: every one of the 29 statements is an explicit
 * Yes / No / N/A answer (never a silent default), each "Yes" needs a Clause 32
 * explanation, and the landlord can't proceed until every applicable item is
 * answered. Fast path: one "Mark all as No" tap.
 */
export function StepCondition({ data, onUpdate }: Props) {
  const cr = (data.conditionReport || {}) as any;
  const details = (data.conditionDetails || {}) as any;

  // The 29 statements minus the "years resided" numeric (item 27), which has
  // its own field below.
  const items = useMemo(() => CONDITION_QUESTIONS.filter((q: any) => !q.isYearsQuestion), []);
  const isApplicable = (q: any) => (q.requiresFeature ? !!(data as any)[q.requiresFeature] : true);

  // Compose the Clause 32 block (per-item, referenced by number) from the
  // current answers + details, and mirror it into conditionReport.comments so
  // the lease PDF renders the explanations.
  const composeComments = (crNext: any, detailsNext: any): string => {
    const lines: Array<{ id: number; t: string }> = [];
    for (const [key, val] of Object.entries(crNext)) {
      if (val !== 'yes') continue;
      const m = /^s(\d+)_/.exec(key);
      if (!m) continue;
      const c = (detailsNext[key]?.comment || '').trim();
      lines.push({ id: Number(m[1]), t: `Item ${m[1]}: ${c || '(no details provided)'}` });
    }
    lines.sort((a, b) => a.id - b.id);
    return lines.map((l) => l.t).join('\n');
  };

  const commit = (crNext: any, detailsNext: any) => {
    onUpdate({
      conditionReport: { ...crNext, comments: composeComments(crNext, detailsNext) },
      conditionDetails: detailsNext,
    });
  };
  const setAnswers = (patch: Record<string, string>) => commit({ ...cr, ...patch }, details);
  const setAnswer = (key: string, val: string) => setAnswers({ [key]: val });
  const setDetail = (key: string, patch: Record<string, any>) =>
    commit(cr, { ...details, [key]: { ...(details[key] || {}), ...patch } });

  // A property with no pool/alarm can't have a condition to disclose there —
  // default those statements to N/A (objectively correct, not a certification)
  // so only the genuinely-relevant items remain for the landlord to answer.
  useEffect(() => {
    const patch: Record<string, string> = {};
    for (const q of items) {
      if (!isApplicable(q) && !cr[q.key]) patch[q.key] = 'na';
    }
    if (Object.keys(patch).length) setAnswers(patch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.hasPool, data.hasAlarmSecurity]);

  const applicableItems = items.filter(isApplicable);
  const answeredCount = applicableItems.filter((q: any) => cr[q.key]).length;
  const totalCount = applicableItems.length;
  const allAnswered = answeredCount === totalCount;
  const flaggedMissingComment = applicableItems.filter(
    (q: any) => cr[q.key] === 'yes' && !(details[q.key]?.comment || '').trim(),
  );

  const markAllNo = () => {
    const patch: Record<string, string> = {};
    for (const q of items) {
      if (cr[q.key]) continue; // never overwrite an existing answer
      patch[q.key] = isApplicable(q) ? 'no' : 'na';
    }
    setAnswers(patch);
  };

  // Jump to the first unanswered item (spec: guide to the next open item).
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const jumpToNextUnanswered = () => {
    const next = applicableItems.find((q: any) => !cr[q.key]);
    if (next) rowRefs.current[next.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="space-y-4">
      <Card
        title="Property condition disclosure"
        subtitle="Your statutory disclosure under the Property Practitioners Act §67"
        icon={<ClipboardCheck className="h-4 w-4" />}
      >
        <p className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-500">
          Answer every statement <span className="font-semibold text-slate-600">Yes</span>,{' '}
          <span className="font-semibold text-slate-600">No</span> or{' '}
          <span className="font-semibold text-slate-600">N/A</span>. If a property is in good order, tap{' '}
          <span className="font-semibold text-slate-600">Mark all as No</span> and then flag only the exceptions —
          each “Yes” needs a short explanation.
        </p>

        {/* Progress + bulk action */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-slate-800">{answeredCount}/{totalCount} answered</span>
              {allAnswered && (
                <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                </span>
              )}
            </div>
            <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${totalCount ? (answeredCount / totalCount) * 100 : 0}%`, background: LEASE_ACCENT }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={markAllNo}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-[12.5px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            Mark all as No
          </button>
        </div>

        {!allAnswered && (
          <button
            type="button"
            onClick={jumpToNextUnanswered}
            className="mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-violet-600 hover:text-violet-700"
          >
            <ArrowDown className="h-3.5 w-3.5" /> Jump to next unanswered
          </button>
        )}

        {/* Statement list */}
        <div className="space-y-2">
          {items.map((q: any) => {
            const applicable = isApplicable(q);
            const val = cr[q.key] || '';
            const flagged = val === 'yes';
            const needsComment = flagged && !(details[q.key]?.comment || '').trim();
            return (
              <div
                key={q.key}
                ref={(el) => { rowRefs.current[q.key] = el; }}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  flagged ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="mb-2 flex items-start gap-2">
                  <span className="mt-0.5 text-[11px] font-bold text-slate-400">{q.id}</span>
                  <p className="text-[12.5px] leading-snug text-slate-700">
                    {q.question}
                    {!applicable && (
                      <span className="ml-1 text-[11px] font-medium text-slate-400">· not applicable to this property</span>
                    )}
                  </p>
                </div>
                <ConditionToggle
                  value={val}
                  polarity={q.neutral ? 'neutral' : 'fault'}
                  onChange={(v) => setAnswer(q.key, v)}
                  idBase={q.key}
                />

                {flagged && (
                  <div className="mt-2.5 rounded-lg border border-amber-200 bg-white p-2.5">
                    <Field
                      label={`Clause 32 — explain item ${q.id}`}
                      required
                      hint={needsComment ? undefined : 'This goes into the lease disclosure, referenced by item number'}
                    >
                      <TextArea
                        value={details[q.key]?.comment || ''}
                        onChange={(e) => setDetail(q.key, { comment: e.target.value })}
                        placeholder="e.g. Geyser drips slightly from the pressure valve; plumber quoted for a seal kit."
                        className={needsComment ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100' : ''}
                      />
                    </Field>
                    {needsComment && (
                      <p className="mt-1.5 text-[11.5px] font-medium text-rose-500">A short explanation is required for anything you flag “Yes”.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Item 27 — years resided (statutory) */}
      <Card title="Occupancy" subtitle="Statutory disclosure item 27" icon={<ClipboardCheck className="h-4 w-4" />}>
        <Field label="Approximately how many years have you resided in / owned the property?" hint="Optional — leave blank if not applicable">
          <TextInput
            type="number"
            min={0}
            step="0.5"
            value={cr.s27_yearsResided || ''}
            onChange={(e) => setAnswer('s27_yearsResided', e.target.value)}
            placeholder="e.g. 3"
          />
        </Field>
      </Card>

      {flaggedMissingComment.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-700">
          {flaggedMissingComment.length} flagged item{flaggedMissingComment.length > 1 ? 's' : ''} still need
          {flaggedMissingComment.length > 1 ? '' : 's'} an explanation before you can send the lease.
        </div>
      )}
    </div>
  );
}

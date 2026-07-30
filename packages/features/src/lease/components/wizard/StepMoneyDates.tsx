// @ts-nocheck
import React from 'react';
import { Calendar, Banknote, AlertTriangle } from 'lucide-react';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { Card, Field, TextInput } from './wizardUi';
import { RentCollectionFields } from './RentCollectionFields';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
}

// Whole years between two ISO dates (for the >10yr guardrail hint).
function yearsBetween(start?: string, end?: string): number | null {
  if (!start || !end) return null;
  const s = new Date(start), e = new Date(end);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
  return (e.getTime() - s.getTime()) / (365.25 * 24 * 3600 * 1000);
}

const rand = 'flex-1 rounded-xl border px-3 py-2.5 text-[13.5px] font-semibold transition-colors';

export function StepMoneyDates({ data, onUpdate }: Props) {
  const isFixed = data.leaseType === 'fixed';
  // Deposit defaults to 3× rent and tracks the rent until the landlord edits it.
  const [depositTouched, setDepositTouched] = React.useState(false);
  const onRentChange = (r: number) =>
    onUpdate({ rentAmount: r, ...(depositTouched ? {} : { depositAmount: r * 3 }) });
  const years = yearsBetween(data.leaseStartDate, data.leaseEndDate);
  const tooLong = isFixed && years != null && years > 10;

  return (
    <div className="space-y-4">
      {/* Lease type + dates */}
      <Card title="Lease term" subtitle="Type and dates" icon={<Calendar className="h-4 w-4" />}>
        <Field label="Lease type" required>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ leaseType: 'fixed' })}
              className={`${rand} ${isFixed ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              Fixed term
            </button>
            <button
              type="button"
              onClick={() => onUpdate({ leaseType: 'month_to_month' })}
              className={`${rand} ${!isFixed ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              Month-to-month
            </button>
          </div>
        </Field>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Start date" required>
            <TextInput type="date" value={data.leaseStartDate || ''} onChange={(e) => onUpdate({ leaseStartDate: e.target.value })} />
          </Field>
          {isFixed && (
            <Field label="End date" required>
              <TextInput type="date" value={data.leaseEndDate || ''} onChange={(e) => onUpdate({ leaseEndDate: e.target.value })} />
            </Field>
          )}
        </div>

        {tooLong && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-[12.5px] text-amber-800">
              This lease runs longer than 10 years. Leases over 10 years can't be signed electronically in
              South Africa — you'll be guided to sign on paper when you send it.
            </p>
          </div>
        )}
      </Card>

      {/* Rent */}
      <Card title="Rent" subtitle="Monthly amount and when it's due" icon={<Banknote className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Monthly rent (R)" required>
            <TextInput type="number" min={0} value={data.rentAmount || ''} onChange={(e) => onRentChange(Number(e.target.value))} placeholder="9500" />
          </Field>
          <Field label="Rent due day" required hint="Day of the month (1–7)">
            <TextInput type="number" min={1} max={7} value={data.rentDueDay || 1} onChange={(e) => onUpdate({ rentDueDay: Math.min(7, Math.max(1, Number(e.target.value))) })} />
          </Field>
          <Field label="Annual escalation (%)" hint="Optional yearly rent increase">
            <TextInput type="number" min={0} step="0.5" value={data.escalationPercent ?? 0} onChange={(e) => onUpdate({ escalationPercent: Number(e.target.value) })} placeholder="e.g. 8" />
          </Field>
        </div>
      </Card>

      {/* Deposit & fees */}
      <Card title="Deposit & fees" subtitle="Security deposit and late payment" icon={<Banknote className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Deposit (R)" required hint="Defaults to 3 months' rent — edit if needed">
            <TextInput type="number" min={0} value={data.depositAmount || ''} onChange={(e) => { setDepositTouched(true); onUpdate({ depositAmount: Number(e.target.value) }); }} placeholder="28500" />
          </Field>
          <Field label="Late payment fee (R)" hint="Charged if rent is late">
            <TextInput type="number" min={0} value={data.lateFeeAmount ?? 0} onChange={(e) => onUpdate({ lateFeeAmount: Number(e.target.value) })} placeholder="250" />
          </Field>
        </div>
      </Card>

      {/* Optional rent-collection banking (not printed in the lease) */}
      <RentCollectionFields data={data} onUpdate={onUpdate} />
    </div>
  );
}

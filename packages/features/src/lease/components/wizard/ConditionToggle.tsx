// @ts-nocheck
import React from 'react';
import { Check, AlertTriangle, Minus, HelpCircle } from 'lucide-react';

/**
 * Reusable three-state disclosure toggle — No / Yes / N/A.
 *
 * Decoupled from any schema so the same control can drive the PPA §67
 * disclosure and (later) the room-by-room inspection. Every state pairs a
 * colour with an ICON and a TEXT label, so meaning survives colour-blindness
 * and a black-and-white PDF export — never colour alone.
 *
 *  - value ''   → unanswered (all three outlined/empty, visibly distinct)
 *  - polarity   → 'fault'  : a "Yes" is a defect, coloured amber/warning
 *                 'neutral': a plain question, "Yes" is not a defect (no red)
 */
export type ToggleValue = 'no' | 'yes' | 'na' | '';

interface Props {
  value: ToggleValue;
  onChange: (v: ToggleValue) => void;
  polarity?: 'fault' | 'neutral';
  disabled?: boolean;
  idBase?: string;
}

const BASE =
  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition-colors select-none';

export function ConditionToggle({ value, onChange, polarity = 'fault', disabled, idBase }: Props) {
  // Selected styles per answer. Fault "Yes" is a warning; neutral "Yes" is calm.
  const styles: Record<'no' | 'yes' | 'na', { on: string; icon: React.ReactNode }> = {
    no: {
      on: polarity === 'fault'
        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
        : 'border-slate-300 bg-slate-100 text-slate-700',
      icon: <Check className="h-3.5 w-3.5" />,
    },
    yes: {
      on: polarity === 'fault'
        ? 'border-amber-400 bg-amber-50 text-amber-700'
        : 'border-slate-300 bg-slate-100 text-slate-700',
      icon: polarity === 'fault' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />,
    },
    na: {
      on: 'border-slate-300 bg-slate-100 text-slate-600',
      icon: <Minus className="h-3.5 w-3.5" />,
    },
  };

  const opts: Array<{ key: 'no' | 'yes' | 'na'; label: string }> = [
    { key: 'no', label: 'No' },
    { key: 'yes', label: 'Yes' },
    { key: 'na', label: 'N/A' },
  ];

  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Disclosure answer">
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            id={idBase ? `${idBase}-${o.key}` : undefined}
            onClick={() => onChange(active ? '' : o.key)}
            className={`${BASE} ${
              active ? styles[o.key].on : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {active ? styles[o.key].icon : <HelpCircle className="h-3.5 w-3.5 opacity-30" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

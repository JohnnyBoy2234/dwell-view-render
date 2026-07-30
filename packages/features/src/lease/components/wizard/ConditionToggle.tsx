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
 * `value` is in the DISPLAY frame (as the on-screen question is phrased):
 *   '' → unanswered (all three outlined/empty, visibly distinct)
 *
 * `concern` says which displayed answer is the concern, so it's coloured amber
 * whichever side it's on:
 *   'yes'  → a "Yes" is the concern (default; e.g. "any known faults?")
 *   'no'   → a "No"  is the concern (e.g. "are all keys available?")
 *   'none' → neutral factual question; no warning colour
 */
export type ToggleValue = 'no' | 'yes' | 'na' | '';

interface Props {
  value: ToggleValue;
  onChange: (v: ToggleValue) => void;
  concern?: 'yes' | 'no' | 'none';
  disabled?: boolean;
  idBase?: string;
}

const BASE =
  'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12.5px] font-semibold transition-colors select-none';

export function ConditionToggle({ value, onChange, concern = 'yes', disabled, idBase }: Props) {
  const roleOf = (k: 'no' | 'yes') => {
    if (concern === 'none') return 'neutral';
    return concern === k ? 'concern' : 'good';
  };

  const styleFor = (k: 'no' | 'yes' | 'na') => {
    if (k === 'na') return { on: 'border-slate-300 bg-slate-100 text-slate-600', icon: <Minus className="h-3.5 w-3.5" /> };
    const role = roleOf(k);
    if (role === 'concern') return { on: 'border-amber-400 bg-amber-50 text-amber-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (role === 'good') return { on: 'border-emerald-400 bg-emerald-50 text-emerald-700', icon: <Check className="h-3.5 w-3.5" /> };
    return { on: 'border-slate-300 bg-slate-100 text-slate-700', icon: <Check className="h-3.5 w-3.5" /> };
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
        const s = styleFor(o.key);
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
              active ? s.on : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            {active ? s.icon : <HelpCircle className="h-3.5 w-3.5 opacity-30" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

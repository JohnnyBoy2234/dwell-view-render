import React, { useState } from 'react';
import { ChevronDown, Lock } from 'lucide-react';

/** Applications-style accent isn't used here — leases own a violet accent. */
export const LEASE_ACCENT = '#7c3aed';
export const LEASE_ACCENT_SOFT = '#f3edff';

/** Mask a SA ID number, showing only the last 4 digits (POPIA-minded). */
export function maskId(id?: string | null): string {
  const s = (id || '').replace(/\s/g, '');
  if (!s) return '';
  if (s.length <= 4) return s;
  return `${'•'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  className?: string;
}
export function Field({ label, children, hint, required, className }: FieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-[13px] font-semibold text-slate-700">
        {label}{required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[12px] text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ''}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-[80px] resize-y ${props.className ?? ''}`} />;
}

/** A card that groups a section of the step. */
export function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-20px_rgba(16,24,40,0.25)] sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: LEASE_ACCENT_SOFT, color: LEASE_ACCENT }}>
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-[12.5px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/** Collapsible "Advanced / customise" panel — SA-standard defaults live behind here. */
export function Expander({ title, note, defaultOpen = false, children }: { title: string; note?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-700">
          <Lock className="h-3.5 w-3.5 text-slate-400" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-200 px-3.5 py-3.5">
          {note && <p className="text-[12px] text-slate-400">{note}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

/** A confirm-me row: a pre-filled value the landlord just verifies. */
export function ConfirmRow({ label, value, empty = 'Not set' }: { label: string; value?: string | null; empty?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-slate-500">{label}</span>
      <span className={`text-[13px] font-medium ${value ? 'text-slate-800' : 'text-slate-400'}`}>{value || empty}</span>
    </div>
  );
}

// @ts-nocheck
import React from 'react';
import { FileCheck, Home, Users, Wrench, Ban, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@mzanzihomes/ui/components/button';
import type { LeaseWizardData, MaintenanceResponsibility } from '@mzanzihomes/common/types/lease';
import { Card, Field, TextArea, Expander, ConfirmRow, LEASE_ACCENT } from './wizardUi';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
  onSend: () => void;
  sending: boolean;
  termTooLong?: boolean;
}

const zar = (v: number) => `R${(Number(v) || 0).toLocaleString('en-ZA')}`;
const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left"
    >
      <span className="text-[13.5px] font-medium text-slate-700">{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-violet-500' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

function MaintPicker({ label, value, onChange }: { label: string; value?: MaintenanceResponsibility; onChange: (v: MaintenanceResponsibility) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {(['tenant', 'landlord'] as const).map((who) => (
          <button
            key={who}
            type="button"
            onClick={() => onChange(who)}
            className={`flex-1 rounded-xl border px-3 py-2 text-[13px] font-semibold capitalize transition-colors ${
              value === who ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600'
            }`}
          >
            {who}
          </button>
        ))}
      </div>
    </Field>
  );
}

/**
 * Step 4 — Review & send. Shows the essentials at a glance; every remaining
 * legal field (CPA, features, maintenance, exclusions, occupants, sectional
 * title) sits behind Advanced panels pre-set to SA-standard defaults, editable
 * on demand. Sending hands off to the existing send-contract-to-tenant pipeline.
 */
export function StepReview({ data, onUpdate, onSend, sending, termTooLong }: Props) {
  const cpaApplies = !!data.tenantIsIndividual && !!data.landlordActingInBusiness;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card title="Review" subtitle="Confirm the essentials before sending" icon={<FileCheck className="h-4 w-4" />}>
        <div className="rounded-xl bg-slate-50 px-3.5 py-2">
          <ConfirmRow label="Property" value={data.propertyAddress} />
          <ConfirmRow label="Tenant" value={data.tenantFullName} />
          <ConfirmRow label="Rent" value={`${zar(data.rentAmount)} / month`} />
          <ConfirmRow label="Deposit" value={zar(data.depositAmount)} />
          <ConfirmRow label="Term" value={data.leaseType === 'fixed' ? `${fmtDate(data.leaseStartDate)} → ${fmtDate(data.leaseEndDate)}` : `Month-to-month from ${fmtDate(data.leaseStartDate)}`} />
        </div>
      </Card>

      {/* Advanced: Property & CPA */}
      <Expander title="Property & legal (CPA)" note="SA-standard defaults — edit if needed.">
        <Toggle label="Sectional title property" checked={!!data.isSectionalTitle} onChange={(v) => onUpdate({ isSectionalTitle: v })} />
        {data.isSectionalTitle && (
          <Toggle label="Body corporate rules apply" checked={!!data.bodyCorpRulesApply} onChange={(v) => onUpdate({ bodyCorpRulesApply: v })} />
        )}
        <Toggle label="Tenant is a company / trust (juristic)" checked={!!data.tenantIsJuristic} onChange={(v) => onUpdate({ tenantIsJuristic: v, tenantIsIndividual: !v })} />
        <Toggle label="I'm renting as a business" checked={!!data.landlordActingInBusiness} onChange={(v) => onUpdate({ landlordActingInBusiness: v })} />
        <div className="rounded-lg bg-slate-100/70 px-3 py-2 text-[12.5px] text-slate-500">
          Consumer Protection Act {cpaApplies ? 'applies' : 'does not apply'} to this lease (auto-determined).
        </div>
      </Expander>

      {/* Advanced: Features */}
      <Expander title="Property features" note="Used for the relevant clauses.">
        <Toggle label="Swimming pool" checked={!!data.hasPool} onChange={(v) => onUpdate({ hasPool: v })} />
        <Toggle label="Garden" checked={!!data.hasGarden} onChange={(v) => onUpdate({ hasGarden: v })} />
        <Toggle label="Alarm / security system" checked={!!data.hasAlarmSecurity} onChange={(v) => onUpdate({ hasAlarmSecurity: v })} />
        <Toggle label="Pets allowed" checked={!!data.petsAllowed} onChange={(v) => onUpdate({ petsAllowed: v })} />
        <Toggle label="Smoking allowed" checked={!!data.smokingAllowed} onChange={(v) => onUpdate({ smokingAllowed: v })} />
      </Expander>

      {/* Advanced: Maintenance (only relevant features) */}
      {(data.hasPool || data.hasGarden || data.hasAlarmSecurity) && (
        <Expander title="Maintenance responsibility" note="Who maintains what.">
          {data.hasPool && <MaintPicker label="Pool" value={data.poolMaintenanceBy} onChange={(v) => onUpdate({ poolMaintenanceBy: v })} />}
          {data.hasGarden && <MaintPicker label="Garden" value={data.gardenMaintenanceBy} onChange={(v) => onUpdate({ gardenMaintenanceBy: v })} />}
          {data.hasAlarmSecurity && <MaintPicker label="Alarm / security" value={data.alarmMaintenanceBy} onChange={(v) => onUpdate({ alarmMaintenanceBy: v })} />}
        </Expander>
      )}

      {/* Advanced: Exclusions & occupants */}
      <Expander title="Exclusions & occupants">
        <Field label="Items excluded from the lease" hint="e.g. a locked storeroom, the owner's furniture">
          <TextArea value={data.excludedItemsList || ''} onChange={(e) => onUpdate({ excludedItemsList: e.target.value })} placeholder="Leave blank if none" />
        </Field>
        <Field label="Additional permitted occupants" hint="Others who'll live there besides the tenant">
          <TextArea value={data.occupantsList || ''} onChange={(e) => onUpdate({ occupantsList: e.target.value })} placeholder="Leave blank if none" />
        </Field>
      </Expander>

      {/* Send / guardrail */}
      <div className="pt-1">
        {termTooLong ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-[14px] font-bold text-amber-900">This lease can't be signed electronically</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800">
                  Leases longer than <b>10 years</b> can't be validly signed by electronic signature under South
                  African law — they must be signed in <b>wet ink</b>, and a lease over 10 years should be
                  registered against the property's title deed.
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-amber-800">
                  Download the lease, print it, sign it with the tenant in person, and keep the signed original.
                  If you'd rather e-sign, shorten the term to 10 years or less, or use month-to-month.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Button
              onClick={onSend}
              disabled={sending}
              className="w-full py-6 text-[15px] font-bold text-white"
              style={{ background: LEASE_ACCENT }}
            >
              <Send className="mr-2 h-5 w-5" />
              {sending ? 'Sending…' : 'Send to tenant to sign'}
            </Button>
            <p className="mt-2 text-center text-[12px] text-slate-400">
              The tenant reviews and signs first; you countersign afterwards from the Leases tab.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

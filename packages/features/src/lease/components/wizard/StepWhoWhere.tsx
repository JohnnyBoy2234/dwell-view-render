// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Home, User, Landmark, Building2 } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { Card, Field, TextInput, Expander, ConfirmRow, maskId } from './wizardUi';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
  propertyLocked: boolean; // true when a propertyId was handed in
  onPickProperty?: (propertyId: string) => void;
}

/**
 * Step 1 — Who & Where. The landlord confirms the property and tenant (both
 * autofilled from records); their own details and payout banking are pulled in
 * and tucked behind confirm-me expanders. Only what's genuinely blank needs
 * typing.
 */
export function StepWhoWhere({ data, onUpdate, propertyLocked, onPickProperty }: Props) {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Array<{ id: string; title: string; location: string }>>([]);

  // Property picker only when no property was handed in.
  useEffect(() => {
    if (propertyLocked || !user) return;
    supabase
      .from('properties')
      .select('id, title, location')
      .eq('landlord_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setProperties((data as any) ?? []));
  }, [propertyLocked, user]);

  return (
    <div className="space-y-4">
      {/* Property */}
      <Card title="Property" subtitle="The home this lease is for" icon={<Home className="h-4 w-4" />}>
        {propertyLocked ? (
          <div className="rounded-xl bg-slate-50 px-3.5 py-3">
            <p className="text-[14px] font-semibold text-slate-900">{data.propertyAddress || 'Selected property'}</p>
            <p className="text-[12.5px] text-slate-500">Pulled from your listing</p>
          </div>
        ) : (
          <Field label="Choose the property" required>
            <select
              value=""
              onChange={(e) => e.target.value && onPickProperty?.(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="">Select a property…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.location || p.title}</option>
              ))}
            </select>
          </Field>
        )}

        <div className="mt-3">
          <Field label="Property address (as it appears on the lease)" required>
            <TextInput
              value={data.propertyAddress || ''}
              onChange={(e) => onUpdate({ propertyAddress: e.target.value })}
              placeholder="12 Main Road, Sea Point, Cape Town, 8005"
            />
          </Field>
        </div>
      </Card>

      {/* Tenant */}
      <Card title="Tenant" subtitle="Who's renting the property" icon={<User className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput value={data.tenantFullName || ''} onChange={(e) => onUpdate({ tenantFullName: e.target.value })} placeholder="Thandi Nkosi" />
          </Field>
          <Field label="Email" required>
            <TextInput type="email" value={data.tenantEmail || ''} onChange={(e) => onUpdate({ tenantEmail: e.target.value })} placeholder="thandi@email.com" />
          </Field>
          <Field label="ID number" required hint={data.tenantIdNumber ? 'From their verified profile — stored securely' : undefined}>
            <TextInput
              value={data.tenantIdNumber || ''}
              onChange={(e) => onUpdate({ tenantIdNumber: e.target.value })}
              placeholder="South African ID number"
              inputMode="numeric"
            />
          </Field>
          <Field label="Phone">
            <TextInput value={data.tenantPhone || ''} onChange={(e) => onUpdate({ tenantPhone: e.target.value })} placeholder="082 123 4567" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Tenant's postal / physical address" hint="Used for legal notices">
            <TextInput value={data.tenantAddress || ''} onChange={(e) => onUpdate({ tenantAddress: e.target.value })} placeholder="Same as property, or another address" />
          </Field>
        </div>
      </Card>

      {/* Your details — confirm-me */}
      <Expander
        title="Your details (landlord)"
        note="Pulled from your profile. Confirm or edit."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput value={data.landlordFullName || ''} onChange={(e) => onUpdate({ landlordFullName: e.target.value })} />
          </Field>
          <Field label="Email" required>
            <TextInput type="email" value={data.landlordEmail || ''} onChange={(e) => onUpdate({ landlordEmail: e.target.value })} />
          </Field>
          <Field label="ID number" required hint={data.landlordIdNumber ? `Stored securely · ${maskId(data.landlordIdNumber)}` : undefined}>
            <TextInput value={data.landlordIdNumber || ''} onChange={(e) => onUpdate({ landlordIdNumber: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="Phone">
            <TextInput value={data.landlordPhone || ''} onChange={(e) => onUpdate({ landlordPhone: e.target.value })} />
          </Field>
        </div>
        <Field label="Your address" hint="Where the tenant sends legal notices">
          <TextInput value={data.landlordAddress || ''} onChange={(e) => onUpdate({ landlordAddress: e.target.value })} />
        </Field>
      </Expander>

      {/* Payout banking — confirm-me */}
      <Expander
        title="Rent payout details"
        note="Where the tenant's rent is paid. Entered once and reused."
      >
        <div className="mb-2 rounded-lg bg-slate-100/70 px-3 py-2">
          <ConfirmRow label="Bank" value={data.landlordBankName} />
          <ConfirmRow label="Account" value={data.landlordAccountNumber} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bank">
            <TextInput value={data.landlordBankName || ''} onChange={(e) => onUpdate({ landlordBankName: e.target.value })} placeholder="Standard Bank" />
          </Field>
          <Field label="Account holder">
            <TextInput value={data.landlordAccountHolder || ''} onChange={(e) => onUpdate({ landlordAccountHolder: e.target.value })} />
          </Field>
          <Field label="Account number">
            <TextInput value={data.landlordAccountNumber || ''} onChange={(e) => onUpdate({ landlordAccountNumber: e.target.value })} inputMode="numeric" />
          </Field>
          <Field label="Branch code">
            <TextInput value={data.landlordBranchCode || ''} onChange={(e) => onUpdate({ landlordBranchCode: e.target.value })} inputMode="numeric" />
          </Field>
        </div>
      </Expander>
    </div>
  );
}

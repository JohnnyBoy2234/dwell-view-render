// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { Landmark } from 'lucide-react';
import { supabase } from '@mzanzihomes/supabase/client';
import type { LeaseWizardData } from '@mzanzihomes/common/types/lease';
import { Card, Field, TextInput } from './wizardUi';

interface Props {
  data: LeaseWizardData;
  onUpdate: (u: Partial<LeaseWizardData>) => void;
}

/**
 * "Rent collection" banking on the lease wizard. Captures the Paystack settlement
 * bank CODE + human-readable bank name + account holder + account number + branch
 * code. These payout details are shown in the generated lease's Payment Details
 * section and used to create the payout subaccount post-signing. Collected during
 * lease creation (required with an explicit skip), so the landlord is set up
 * before the lease is finalised rather than chasing it later.
 */
export function RentCollectionFields({ data, onUpdate }: Props) {
  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke('list-paystack-banks')
      .then(({ data: res }) => { if (!cancelled) setBanks((res?.banks ?? []) as any); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const pickBank = (code: string) => {
    const bank = banks.find((b) => b.code === code);
    onUpdate({ landlordBankCode: code, landlordBankName: bank?.name || data.landlordBankName || '' });
  };

  return (
    <Card
      title="Get paid on time, from day one"
      subtitle="Add your payout bank account"
      icon={<Landmark className="h-4 w-4" />}
    >
      <p className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-500">
        Take a minute to add your bank account now and make rent collection effortless once the lease is
        signed. Your tenant can pay securely in-app, helping you avoid payment delays and unnecessary
        follow-ups.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bank">
          <select
            value={data.landlordBankCode || ''}
            onChange={(e) => pickBank(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">{loading ? 'Loading banks…' : 'Select your bank'}</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Account holder">
          <TextInput
            value={data.landlordAccountHolder || ''}
            onChange={(e) => onUpdate({ landlordAccountHolder: e.target.value })}
            placeholder={data.landlordFullName || 'Account holder name'}
          />
        </Field>
        <Field label="Account number">
          <TextInput
            value={data.landlordAccountNumber || ''}
            onChange={(e) => onUpdate({ landlordAccountNumber: e.target.value })}
            placeholder="1234567890"
            inputMode="numeric"
          />
        </Field>
        <Field label="Branch code">
          <TextInput
            value={data.landlordBranchCode || ''}
            onChange={(e) => onUpdate({ landlordBranchCode: e.target.value })}
            placeholder="250655"
            inputMode="numeric"
          />
        </Field>
      </div>
    </Card>
  );
}

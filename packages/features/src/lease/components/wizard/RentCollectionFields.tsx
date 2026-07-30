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
 * Optional "Rent collection" banking on the lease wizard. Captures the Paystack
 * settlement bank CODE + account details so the payout subaccount can be created
 * after both parties sign. Nothing here is printed in the lease PDF, and it does
 * NOT create the subaccount — that happens post-signing with a confirm step. A
 * landlord who skips this is pointed to the dashboard "Rent collection" tile.
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
      title="Rent collection"
      subtitle="Optional — where rent gets paid out. Set up now or later."
      icon={<Landmark className="h-4 w-4" />}
    >
      <p className="mb-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-slate-500">
        Add your bank account so tenants can pay rent in-app once the lease is signed. This isn't printed
        in the lease. You can also set it up anytime from <span className="font-semibold text-slate-600">Rent
        collection</span> on your dashboard.
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
        <Field label="Account number" className="sm:col-span-2">
          <TextInput
            value={data.landlordAccountNumber || ''}
            onChange={(e) => onUpdate({ landlordAccountNumber: e.target.value })}
            placeholder="1234567890"
            inputMode="numeric"
          />
        </Field>
      </div>
    </Card>
  );
}

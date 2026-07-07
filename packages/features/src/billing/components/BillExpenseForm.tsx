import { useState } from 'react';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Plus, Trash2 } from 'lucide-react';
import type { BillLineItemInput } from '../hooks/useMonthlyBills';

const PRESETS: { category: BillLineItemInput['category']; label: string }[] = [
  { category: 'water', label: 'Water' },
  { category: 'sewage', label: 'Sewage' },
  { category: 'electricity', label: 'Electricity' },
  { category: 'refuse', label: 'Refuse' },
];

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

interface Props {
  rentAmount: number;
  onSend: (lineItems: BillLineItemInput[]) => void;
  sending: boolean;
  sendBlockedReason?: string; // e.g. missing subaccount
}

export function BillExpenseForm({ rentAmount, onSend, sending, sendBlockedReason }: Props) {
  const [presets, setPresets] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<{ label: string; amount: string }[]>([]);

  const lineItems: BillLineItemInput[] = [
    ...PRESETS.filter(p => Number(presets[p.category]) > 0)
      .map(p => ({ category: p.category, label: p.label, amount: Number(presets[p.category]) })),
    ...custom.filter(c => c.label.trim() && Number(c.amount) > 0)
      .map(c => ({ category: 'other' as const, label: c.label.trim(), amount: Number(c.amount) })),
  ];
  const total = rentAmount + lineItems.reduce((s, li) => s + li.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
        <span className="text-sm font-medium">Rent (from lease)</span>
        <span className="text-sm font-semibold">{fmtR(rentAmount)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(p => (
          <div key={p.category}>
            <Label htmlFor={`exp-${p.category}`}>{p.label}</Label>
            <Input
              id={`exp-${p.category}`} type="number" inputMode="decimal" min="0" placeholder="0.00"
              value={presets[p.category] ?? ''}
              onChange={e => setPresets(s => ({ ...s, [p.category]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {custom.map((c, i) => (
        <div key={i} className="flex items-end gap-2">
          <div className="flex-1">
            <Label>Charge</Label>
            <Input placeholder="e.g. Garden service" value={c.label}
              onChange={e => setCustom(cs => cs.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
          </div>
          <div className="w-32">
            <Label>Amount</Label>
            <Input type="number" inputMode="decimal" min="0" placeholder="0.00" value={c.amount}
              onChange={e => setCustom(cs => cs.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => setCustom(cs => cs.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setCustom(cs => [...cs, { label: '', amount: '' }])}>
        <Plus className="h-4 w-4 mr-1" /> Add other charge
      </Button>

      <div className="flex items-center justify-between rounded-xl border px-4 py-3">
        <span className="font-semibold">Total to tenant</span>
        <span className="text-lg font-bold">{fmtR(total)}</span>
      </div>

      {sendBlockedReason ? (
        <p className="text-sm text-destructive">{sendBlockedReason}</p>
      ) : null}
      <Button className="w-full" disabled={sending || !!sendBlockedReason} onClick={() => onSend(lineItems)}>
        {sending ? 'Sending…' : 'Send to tenant'}
      </Button>
    </div>
  );
}

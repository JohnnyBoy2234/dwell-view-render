// @ts-nocheck
import { useState } from 'react';
import { useUnpaidBill } from '../hooks/useUnpaidBill';
import { BillDetailSheet } from './BillDetailSheet';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export function RentDueBanner() {
  const { data: bill } = useUnpaidBill();
  const [open, setOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);

  if (!bill) return null;
  const monthName = new Date(`${bill.period}-01`).toLocaleDateString('en-ZA', { month: 'long' });

  return (
    <>
      <button
        onClick={() => { setPayNow(false); setOpen(true); }}
        className="sticky top-0 z-50 flex w-full items-center justify-between gap-3 bg-red-600 px-4 py-2.5 text-left text-white"
        aria-label={`Rent due ${fmtR(Number(bill.total_amount))} — view bill`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold leading-tight">
            {monthName} rent &amp; utilities
          </span>
          <span className="block text-xs opacity-90">{fmtR(Number(bill.total_amount))} outstanding</span>
        </span>
        <span
          onClick={(e) => { e.stopPropagation(); setPayNow(true); setOpen(true); }}
          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-red-600"
        >
          Pay now
        </span>
      </button>
      <BillDetailSheet bill={bill} open={open} onOpenChange={setOpen} autoPay={payNow} />
    </>
  );
}

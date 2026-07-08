// @ts-nocheck
import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { useUnpaidBill } from '../hooks/useUnpaidBill';
import { BillDetailSheet } from './BillDetailSheet';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export function RentDueBanner() {
  const { data: bill } = useUnpaidBill();
  const [open, setOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);

  // Green success flash right after a rent payment (flag set on PaymentSuccess).
  // The banner is mounted at the app root and never unmounts on SPA navigation,
  // so we check the flag both on mount AND on a custom event fired by
  // PaymentSuccess right before it navigates to the dashboard.
  const [justPaid, setJustPaid] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flash = () => {
      if (localStorage.getItem('rentJustPaid') !== '1') return;
      localStorage.removeItem('rentJustPaid');
      setJustPaid(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setJustPaid(false), 4000);
    };
    flash();
    window.addEventListener('rent-just-paid', flash);
    return () => {
      window.removeEventListener('rent-just-paid', flash);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (justPaid) {
    return (
      <div
        className="sticky top-0 z-50 flex w-full items-center justify-center gap-2 bg-green-600 px-4 py-2.5 text-white transition-opacity duration-500 animate-in fade-in"
        role="status"
      >
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold">Rent paid — thank you!</span>
      </div>
    );
  }

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

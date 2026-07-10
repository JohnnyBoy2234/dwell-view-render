// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';
import { useUnpaidBill } from '../hooks/useUnpaidBill';
import { BillDetailSheet } from './BillDetailSheet';

// Publishes the banner's rendered height as --rent-banner-h on <html> so
// fixed/sticky chrome elsewhere (MiniNavbar, dashboard header) can offset
// themselves below the banner while it's visible, and snap back when it goes.
function useBannerHeightVar(visible: boolean, variant: string) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !ref.current) {
      root.style.setProperty('--rent-banner-h', '0px');
      return;
    }
    const el = ref.current;
    const update = () => root.style.setProperty('--rent-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--rent-banner-h', '0px');
    };
    // variant re-runs the effect when the green flash swaps to/from the red
    // banner — same `visible` but a different DOM element behind the ref.
  }, [visible, variant]);
  return ref;
}

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

  const bannerRef = useBannerHeightVar(justPaid || !!bill, justPaid ? 'paid' : 'due');

  if (justPaid) {
    return (
      <div
        ref={bannerRef}
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
        ref={bannerRef}
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

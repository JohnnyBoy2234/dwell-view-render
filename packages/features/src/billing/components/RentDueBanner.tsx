// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, X, Wallet } from 'lucide-react';
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
  const { pathname } = useLocation();
  // Hidden inside Messages — the full-screen chat pane owns the top of the
  // screen and the banner (higher z-index) was covering the chat header.
  const inMessages = pathname.startsWith('/messages') || pathname.startsWith('/tenant/messages');
  const { data: bill } = useUnpaidBill();
  const [open, setOpen] = useState(false);
  const [payNow, setPayNow] = useState(false);
  // Let the tenant dismiss the banner so it doesn't stay pinned the whole
  // session. Keyed by bill period, so it reappears next session or when a new
  // month's bill is raised — never permanently hidden.
  const [dismissedPeriod, setDismissedPeriod] = useState<string | null>(() => {
    try { return sessionStorage.getItem('rentBannerDismissed'); } catch { return null; }
  });

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

  const isDismissed = !!bill && dismissedPeriod === bill.period;
  const bannerRef = useBannerHeightVar(!inMessages && (justPaid || (!!bill && !isDismissed)), justPaid ? 'paid' : 'due');

  if (inMessages) return null;

  if (justPaid) {
    return (
      <div ref={bannerRef} className="sticky top-0 z-50 px-3 pt-2" role="status">
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-white shadow-[0_10px_24px_-10px_rgba(5,150,105,0.7)] animate-in fade-in slide-in-from-top-2 duration-500">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold">Rent paid — thank you!</span>
        </div>
      </div>
    );
  }

  if (!bill || isDismissed) return null;
  const monthName = new Date(`${bill.period}-01`).toLocaleDateString('en-ZA', { month: 'long' });

  const dismiss = () => {
    setDismissedPeriod(bill.period);
    try { sessionStorage.setItem('rentBannerDismissed', bill.period); } catch { /* ignore */ }
  };

  return (
    <>
      <div ref={bannerRef} className="sticky top-0 z-50 px-3 pt-2">
        <div
          className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-white shadow-[0_14px_34px_-12px_rgba(190,18,60,0.7)] animate-in fade-in slide-in-from-top-2 duration-300"
          style={{ background: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)' }}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <Wallet className="h-[18px] w-[18px]" />
          </span>
          <button
            type="button"
            onClick={() => { setPayNow(false); setOpen(true); }}
            className="min-w-0 flex-1 text-left"
            aria-label={`Rent due ${fmtR(Number(bill.total_amount))} — view bill`}
          >
            <span className="block truncate text-sm font-bold leading-tight">
              {monthName} rent &amp; utilities
            </span>
            <span className="block truncate text-xs opacity-90">{fmtR(Number(bill.total_amount))} outstanding</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setPayNow(true); setOpen(true); }}
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-rose-600 shadow-sm active:scale-95 transition"
          >
            Pay now
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            aria-label="Dismiss rent reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <BillDetailSheet bill={bill} open={open} onOpenChange={setOpen} autoPay={payNow} />
    </>
  );
}

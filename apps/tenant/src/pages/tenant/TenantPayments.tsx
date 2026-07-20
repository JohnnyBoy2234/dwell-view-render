import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonthlyBills, BillDetailSheet, formatPeriod } from '@mzanzihomes/features/billing';
import { Progress } from '@mzanzihomes/ui/components/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@mzanzihomes/ui/components/dialog';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import {
  FileText, ReceiptText, CreditCard, CheckCircle2, Clock, Download,
  ScrollText, CalendarClock, ShieldCheck, ChevronRight, ArrowRight,
} from 'lucide-react';
import PaymentsWallet from '@/components/PaymentsWallet';

const TEAL = '#0d9488';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(n) || 0);
const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** Rent bills are monthly; with no explicit due-date column we treat the 1st of
 * the bill's period month as the due date. */
const periodDueDate = (period?: string | null): Date | null => {
  if (!period) return null;
  const [y, m] = period.split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1);
};
const daysUntil = (d: Date | null): number | null =>
  d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;

const openDoc = (navigate: ReturnType<typeof useNavigate>, path: string, title: string, version?: string) =>
  navigate(`/document?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}${version ? `&v=${encodeURIComponent(version)}` : ''}`);

/**
 * Tenant Payments — real monthly bills. Each bill carries its invoice PDF, and
 * once paid, a receipt PDF. Rendered inside TileDetailLayout, so it owns no
 * top-level page heading here.
 */
export default function TenantPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { billsQuery } = useMonthlyBills();
  const bills = (billsQuery.data ?? []) as any[];
  const loading = billsQuery.isLoading;

  const [payBill, setPayBill] = useState<any | null>(null);
  const [detailBill, setDetailBill] = useState<any | null>(null);
  const [showAll, setShowAll] = useState(false);

  const recentRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLDivElement | null>(null);

  const outstanding = useMemo(
    () => bills.filter((b) => b.status !== 'paid').reduce((s, b) => s + Number(b.total_amount || 0), 0),
    [bills],
  );
  const nextUnpaid = useMemo(() => bills.find((b) => b.status !== 'paid') ?? null, [bills]);
  const recent = useMemo(() => bills.filter((b) => b.id !== nextUnpaid?.id), [bills, nextUnpaid]);
  const latestInvoice = useMemo(() => bills.find((b) => b.invoice_pdf_path), [bills]);
  const latestReceipt = useMemo(() => bills.find((b) => b.status === 'paid' && b.receipt_pdf_path), [bills]);

  const propertyName = (b: any) => b?.properties?.title || b?.properties?.location || 'Your rental';

  const scrollTo = (ref: React.RefObject<HTMLElement>) =>
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const statusPill = (bill: any) => {
    if (bill.status === 'paid') return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 };
    const d = daysUntil(periodDueDate(bill.period));
    if (d !== null && d < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-600', Icon: Clock };
    return { label: 'Due soon', cls: 'bg-amber-50 text-amber-700', Icon: Clock };
  };

  const QUICK = [
    { icon: ScrollText, label: 'View statements', onClick: () => latestInvoice ? openDoc(navigate, latestInvoice.invoice_pdf_path, `Invoice — ${formatPeriod(latestInvoice.period)}`, latestInvoice.updated_at) : toast({ title: 'No statements yet', description: 'Invoices appear here once your landlord sends a bill.' }) },
    { icon: ReceiptText, label: 'Payment history', onClick: () => scrollTo(recentRef) },
    { icon: CalendarClock, label: 'Upcoming payments', onClick: () => nextUnpaid ? scrollTo(nextRef) : toast({ title: "You're all caught up", description: 'No upcoming payments due.' }) },
    { icon: Download, label: 'Download receipts', onClick: () => latestReceipt ? openDoc(navigate, latestReceipt.receipt_pdf_path, `Receipt — ${formatPeriod(latestReceipt.period)}`, latestReceipt.updated_at) : toast({ title: 'No receipts yet', description: 'Receipts are saved automatically once you pay a bill.' }) },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-52 animate-pulse rounded-[28px] bg-white/70" />
        <div className="h-28 animate-pulse rounded-[28px] bg-white/70" />
        <div className="h-40 animate-pulse rounded-[28px] bg-white/70" />
      </div>
    );
  }

  const dueDate = periodDueDate(nextUnpaid?.period);
  const dLeft = daysUntil(dueDate);
  const dueLine = dLeft === null ? '' : dLeft > 0 ? `Due in ${dLeft} day${dLeft === 1 ? '' : 's'}` : dLeft === 0 ? 'Due today' : 'Overdue';
  const progress = dLeft === null ? 0 : dLeft <= 0 ? 100 : Math.max(6, Math.min(94, Math.round((1 - dLeft / 30) * 100)));

  return (
    <div className="mx-auto w-full max-w-2xl pb-10 animate-fade-in">
      {/* Hero — total balance + wallet */}
      <div
        className="relative min-h-[176px] overflow-hidden rounded-[28px] p-5 shadow-[0_22px_46px_-28px_rgba(13,148,136,0.55)]"
        style={{ background: 'linear-gradient(135deg,#e9faf6 0%,#d6f3ec 100%)' }}
      >
        <PaymentsWallet className="pointer-events-none absolute right-2 top-0 bottom-0 my-auto h-[150px] w-auto animate-soft-float" />
        <div className="relative z-10 max-w-[58%]">
          <p className="text-[13px] font-semibold text-slate-500">Total balance</p>
          <p className="mt-1 text-[32px] font-extrabold leading-none" style={{ color: TEAL }}>{fmtR(outstanding)}</p>
          {nextUnpaid ? (
            <>
              <p className="mt-3 text-[15px] font-bold text-slate-900">{dueLine}</p>
              <p className="text-[13px] text-slate-500">{fmtDate(dueDate?.toISOString())}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-[15px] font-bold text-slate-900">You&apos;re all paid up</p>
              <p className="text-[13px] text-slate-500">No payments due right now</p>
            </>
          )}
          <button
            type="button"
            onClick={() => nextUnpaid ? setPayBill(nextUnpaid) : scrollTo(recentRef)}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[14px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(13,148,136,0.8)] transition-transform active:scale-[0.97]"
            style={{ background: TEAL }}
          >
            {nextUnpaid ? 'Make a payment' : 'View payment history'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-4 flex rounded-[24px] bg-white p-2 shadow-[0_16px_34px_-26px_rgba(20,50,90,0.4)]">
        {QUICK.map((q, i) => (
          <button
            key={q.label}
            type="button"
            onClick={q.onClick}
            className={`flex flex-1 flex-col items-center gap-2 px-1 py-2.5 text-center transition-transform active:scale-95 ${i < QUICK.length - 1 ? 'border-r border-slate-100' : ''}`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50">
              <q.icon className="h-5 w-5 text-teal-600" />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-slate-600">{q.label}</span>
          </button>
        ))}
      </div>

      {/* Next payment */}
      {nextUnpaid && (
        <div ref={nextRef} className="mt-4 scroll-mt-24">
          <button
            type="button"
            onClick={() => setDetailBill(nextUnpaid)}
            className="w-full rounded-[24px] bg-white p-4 text-left shadow-[0_16px_34px_-26px_rgba(20,50,90,0.45)] transition-transform active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <ReceiptText className="h-[20px] w-[20px] text-teal-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-400">Next payment</p>
                <p className="truncate text-[15.5px] font-extrabold text-slate-900">Rent — {formatPeriod(nextUnpaid.period)}</p>
                <p className="truncate text-[12.5px] text-slate-500">Due on {fmtDate(dueDate?.toISOString())}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15px] font-extrabold text-slate-900">{fmtR(nextUnpaid.total_amount)}</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusPill(nextUnpaid).cls}`}>
                  {dueLine}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </div>
            <div className="mt-3.5">
              <Progress value={progress} className="h-1.5" />
              <p className="mt-1.5 text-[12.5px] font-bold text-teal-600">
                {dLeft !== null && dLeft > 0 ? `${dLeft} day${dLeft === 1 ? '' : 's'} remaining` : dLeft === 0 ? 'Due today' : 'Overdue'}
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Recent payments */}
      {bills.length === 0 ? (
        <div className="mt-4 rounded-[28px] bg-white p-8 text-center shadow-[0_18px_38px_-26px_rgba(20,50,90,0.4)]">
          <PaymentsWallet className="mx-auto h-28 w-auto animate-soft-float" />
          <p className="mt-2 text-[17px] font-bold text-slate-900">No payments yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13.5px] leading-relaxed text-slate-500">
            Your rent payments, invoices and receipts will appear here once your property is linked.
          </p>
        </div>
      ) : recent.length > 0 && (
        <div ref={recentRef} className="mt-6 scroll-mt-24">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[18px] font-extrabold tracking-tight text-slate-900">Recent payments</h3>
            {recent.length > 3 && (
              <button type="button" onClick={() => setShowAll((s) => !s)} className="text-[13px] font-bold text-teal-600 active:opacity-70">
                {showAll ? 'Show less' : 'View all'}
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_16px_34px_-26px_rgba(20,50,90,0.45)]">
            {(showAll ? recent : recent.slice(0, 3)).map((bill, i) => {
              const sp = statusPill(bill);
              return (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => setDetailBill(bill)}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                    <FileText className="h-[20px] w-[20px] text-teal-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-bold text-slate-900">Rent — {formatPeriod(bill.period)}</p>
                    <p className="truncate text-[12.5px] text-slate-500">
                      {bill.status === 'paid' ? `Paid on ${fmtDate(bill.paid_at ?? bill.updated_at)}` : `Due ${fmtDate(periodDueDate(bill.period)?.toISOString())}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14.5px] font-extrabold text-slate-900">{fmtR(bill.total_amount)}</p>
                    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${sp.cls}`}>
                      <sp.Icon className="h-3 w-3" /> {sp.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Secure reassurance */}
      <div className="mt-4 flex items-center gap-3 rounded-[24px] bg-teal-50/60 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-slate-900">Your payments are secure</p>
          <p className="text-[12.5px] text-slate-500">All transactions are encrypted and protected.</p>
        </div>
      </div>

      {/* Payment detail */}
      <Dialog open={!!detailBill} onOpenChange={(v) => { if (!v) setDetailBill(null); }}>
        <DialogContent className="max-w-sm rounded-3xl">
          {detailBill && (() => {
            const paid = detailBill.status === 'paid';
            const sp = statusPill(detailBill);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Rent — {formatPeriod(detailBill.period)}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-teal-50/70 p-4 text-center">
                    <p className="text-[28px] font-extrabold leading-none" style={{ color: TEAL }}>{fmtR(detailBill.total_amount)}</p>
                    <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-bold ${sp.cls}`}>
                      <sp.Icon className="h-3.5 w-3.5" /> {sp.label}
                    </span>
                  </div>
                  <dl className="space-y-2 text-[13.5px]">
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">Property</dt><dd className="truncate font-semibold text-slate-900">{propertyName(detailBill)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-slate-500">{paid ? 'Paid on' : 'Due on'}</dt><dd className="font-semibold text-slate-900">{paid ? fmtDate(detailBill.paid_at ?? detailBill.updated_at) : fmtDate(periodDueDate(detailBill.period)?.toISOString())}</dd></div>
                    {detailBill.paystack_reference && (
                      <div className="flex justify-between gap-3"><dt className="text-slate-500">Reference</dt><dd className="truncate font-mono text-[12px] font-semibold text-slate-900">{detailBill.paystack_reference}</dd></div>
                    )}
                  </dl>

                  {/* Connected documents: invoice = requested, receipt = proof of payment */}
                  <div>
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">Documents</p>
                    <div className="space-y-2">
                      {detailBill.invoice_pdf_path && (
                        <button
                          type="button"
                          onClick={() => openDoc(navigate, detailBill.invoice_pdf_path, `Invoice — ${formatPeriod(detailBill.period)}`, detailBill.updated_at)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left active:bg-slate-50"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><FileText className="h-5 w-5 text-teal-600" /></span>
                          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-bold text-slate-900">Invoice</p><p className="text-[11.5px] text-slate-500">What was requested</p></div>
                          <span className="text-[12.5px] font-bold text-teal-600">View PDF</span>
                        </button>
                      )}
                      {paid && detailBill.receipt_pdf_path ? (
                        <button
                          type="button"
                          onClick={() => openDoc(navigate, detailBill.receipt_pdf_path, `Receipt — ${formatPeriod(detailBill.period)}`, detailBill.updated_at)}
                          className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 p-3 text-left active:bg-slate-50"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50"><ReceiptText className="h-5 w-5 text-teal-600" /></span>
                          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-bold text-slate-900">Receipt</p><p className="text-[11.5px] text-slate-500">Proof of payment</p></div>
                          <span className="text-[12.5px] font-bold text-teal-600">Download</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 p-3 text-slate-400">
                          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50"><ReceiptText className="h-5 w-5" /></span>
                          <div className="min-w-0 flex-1"><p className="text-[13.5px] font-bold">Receipt</p><p className="text-[11.5px]">Saved automatically once you pay</p></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!paid && (
                    <button
                      type="button"
                      onClick={() => { const b = detailBill; setDetailBill(null); setPayBill(b); }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-bold text-white active:scale-[0.99]"
                      style={{ background: TEAL }}
                    >
                      <CreditCard className="h-4.5 w-4.5" /> Pay {fmtR(detailBill.total_amount)}
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {payBill && (
        <BillDetailSheet
          bill={payBill}
          open={!!payBill}
          onOpenChange={(v) => { if (!v) setPayBill(null); }}
        />
      )}
    </div>
  );
}

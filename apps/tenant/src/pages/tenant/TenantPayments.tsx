import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonthlyBills, BillDetailSheet, formatPeriod } from '@mzanzihomes/features/billing';
import { Button } from '@mzanzihomes/ui/components/button';
import {
  FileText, ReceiptText, CreditCard, CheckCircle2, Clock, Wallet,
} from 'lucide-react';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(n) || 0);

const openDoc = (navigate: ReturnType<typeof useNavigate>, path: string, title: string, version?: string) =>
  navigate(`/document?path=${encodeURIComponent(path)}&title=${encodeURIComponent(title)}${version ? `&v=${encodeURIComponent(version)}` : ''}`);

/**
 * Tenant Payments — real monthly bills. Each bill carries its invoice PDF, and
 * once paid, a receipt PDF. Rendered inside TileDetailLayout, so no <h1> here.
 */
export default function TenantPayments() {
  const navigate = useNavigate();
  const { billsQuery } = useMonthlyBills();
  const bills = (billsQuery.data ?? []) as any[];
  const loading = billsQuery.isLoading;

  const [payBill, setPayBill] = useState<any | null>(null);

  const outstanding = useMemo(
    () => bills.filter((b) => b.status !== 'paid').reduce((sum, b) => sum + Number(b.total_amount || 0), 0),
    [bills],
  );
  const nextUnpaid = useMemo(() => bills.find((b) => b.status !== 'paid') ?? null, [bills]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/70" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-8">
      {/* Outstanding summary — only when something is owed */}
      {outstanding > 0 && (
        <div className="mb-5 rounded-3xl bg-white p-5 shadow-[0_18px_40px_-24px_rgba(20,50,90,0.4)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-600">
                <Wallet className="h-4 w-4" /> Outstanding
              </p>
              <p className="mt-1 text-[30px] font-extrabold leading-none text-slate-900">{fmtR(outstanding)}</p>
              <p className="mt-1.5 text-[13px] text-slate-500">
                {bills.filter((b) => b.status !== 'paid').length} unpaid bill{bills.filter((b) => b.status !== 'paid').length === 1 ? '' : 's'}
              </p>
            </div>
            {nextUnpaid && (
              <Button size="lg" className="rounded-2xl bg-blue-600 hover:bg-blue-700" onClick={() => setPayBill(nextUnpaid)}>
                <CreditCard className="mr-2 h-4 w-4" /> Pay now
              </Button>
            )}
          </div>
        </div>
      )}

      {bills.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <ReceiptText className="h-8 w-8 text-blue-400" />
          </div>
          <p className="mt-4 text-[17px] font-bold text-slate-900">No bills yet</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[14px] leading-relaxed text-slate-500">
            When your landlord sends a bill it appears here with its invoice, and your receipt is saved automatically once you've paid.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {bills.map((bill) => {
            const paid = bill.status === 'paid';
            const propertyName = bill.properties?.title || bill.properties?.location || 'Your rental';
            return (
              <div key={bill.id} className="rounded-3xl bg-white p-4 shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-extrabold text-slate-900">{formatPeriod(bill.period)}</p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-500">{propertyName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[17px] font-extrabold text-slate-900">{fmtR(bill.total_amount)}</p>
                    <span
                      className={
                        'mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ' +
                        (paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')
                      }
                    >
                      {paid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 flex flex-wrap gap-2">
                  {bill.invoice_pdf_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => openDoc(navigate, bill.invoice_pdf_path, `Invoice — ${formatPeriod(bill.period)}`, bill.updated_at)}
                    >
                      <FileText className="mr-1.5 h-4 w-4" /> Invoice
                    </Button>
                  )}
                  {paid && bill.receipt_pdf_path && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => openDoc(navigate, bill.receipt_pdf_path, `Receipt — ${formatPeriod(bill.period)}`, bill.updated_at)}
                    >
                      <ReceiptText className="mr-1.5 h-4 w-4" /> Receipt
                    </Button>
                  )}
                  {!paid && (
                    <Button
                      size="sm"
                      className="ml-auto rounded-xl bg-blue-600 hover:bg-blue-700"
                      onClick={() => setPayBill(bill)}
                    >
                      <CreditCard className="mr-1.5 h-4 w-4" /> Pay {fmtR(bill.total_amount)}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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

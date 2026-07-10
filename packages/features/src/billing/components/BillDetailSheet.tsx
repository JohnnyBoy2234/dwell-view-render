// @ts-nocheck
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

interface Props {
  bill: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  autoPay?: boolean;
}

export function BillDetailSheet({ bill, open, onOpenChange, autoPay }: Props) {
  const [paying, setPaying] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const { toast } = useToast();

  const startPayment = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('pay-monthly-bill', {
        body: { billId: bill.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Could not start payment');
      setTestMode(!!data.test_mode);
      // Paystack checkout is a full-page redirect flow; the callback returns via
      // PaymentRedirectHandler on the `reference` query param. This matches the app's
      // existing full-navigation redirect pattern (e.g. DocuSign callback, auth redirects).
      window.location.href = data.authorization_url;
    } catch (e) {
      toast({ title: 'Payment failed to start', description: (e as Error).message, variant: 'destructive' });
      setPaying(false);
    }
  };

  useEffect(() => {
    if (open && autoPay) void startPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPay]);

  const propertyName = bill.properties?.title || bill.properties?.location || 'your home';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {bill.period} bill
            {testMode ? <Badge className="bg-amber-500 text-white">TEST MODE</Badge> : null}
          </SheetTitle>
          <SheetDescription>{propertyName}</SheetDescription>
        </SheetHeader>
        <div className="space-y-2 py-4">
          <div className="flex justify-between text-sm">
            <span>Rent</span><span className="font-medium">{fmtR(Number(bill.rent_amount))}</span>
          </div>
          {(bill.bill_line_items ?? []).map((li: any) => (
            <div key={li.id} className="flex justify-between text-sm">
              <span>{li.label}</span><span className="font-medium">{fmtR(Number(li.amount))}</span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-bold">
            <span>Total</span><span>{fmtR(Number(bill.total_amount))}</span>
          </div>
          {bill.invoice_pdf_path ? (
            <a
              className="block pt-1 text-sm text-primary underline underline-offset-4"
              href={supabase.storage.from('rent-receipts').getPublicUrl(bill.invoice_pdf_path).data.publicUrl}
              target="_blank"
              rel="noreferrer"
            >
              View invoice (PDF)
            </a>
          ) : null}
        </div>
        <Button className="w-full" size="lg" disabled={paying} onClick={startPayment}>
          {paying ? 'Opening secure checkout…' : `Pay ${fmtR(Number(bill.total_amount))}`}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

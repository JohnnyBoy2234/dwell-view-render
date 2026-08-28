// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@mzanzihomes/ui/components/sheet';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { openCheckoutUrl } from '@mzanzihomes/ui/utils/nativeBrowser';
import { formatPeriod } from '../utils';
import { FileText } from 'lucide-react';

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
  const navigate = useNavigate();

  const startPayment = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('pay-monthly-bill', {
        body: { billId: bill.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Could not start payment');
      setTestMode(!!data.test_mode);
      // Web: full-page redirect; the callback returns via PaymentRedirectHandler
      // on the `reference` query param. Native: open the gateway in the in-app
      // browser and refresh on return so the webhook-confirmed bill status shows.
      const outcome = await openCheckoutUrl(data.authorization_url);
      if (outcome === 'closed') window.location.reload();
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
            {formatPeriod(bill.period)} bill
            {testMode ? <Badge className="bg-amber-500 text-white">TEST MODE</Badge> : null}
          </SheetTitle>
          <SheetDescription>Payment for {formatPeriod(bill.period)} — {propertyName}</SheetDescription>
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
        </div>
        <div className="space-y-2">
          {bill.invoice_pdf_path ? (
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                navigate(`/document?path=${encodeURIComponent(bill.invoice_pdf_path)}&title=${encodeURIComponent(`Invoice — ${formatPeriod(bill.period)}`)}&v=${encodeURIComponent(bill.updated_at ?? '')}`);
              }}
            >
              <FileText className="h-4 w-4 mr-2" />
              View invoice
            </Button>
          ) : null}
          <Button className="w-full" size="lg" disabled={paying} onClick={startPayment}>
            {paying ? 'Opening secure checkout…' : `Pay ${fmtR(Number(bill.total_amount))}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

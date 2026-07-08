// @ts-nocheck
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useMonthlyBills } from '../hooks/useMonthlyBills';
import { BillExpenseForm } from './BillExpenseForm';

const fmtR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n);

export function LandlordBillingPanel() {
  const { user } = useAuth();
  const { billsQuery, sendBill } = useMonthlyBills();
  const { toast } = useToast();

  const { data: profile } = useQuery({
    queryKey: ['landlord-subaccount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('paystack_subaccount_code').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const hasSubaccount = !!profile?.paystack_subaccount_code;

  const bills = billsQuery.data ?? [];
  const drafts = bills.filter(b => b.status === 'awaiting_landlord');
  const rest = bills.filter(b => b.status !== 'awaiting_landlord');

  const propertyName = (b: any) => b.properties?.title || b.properties?.location || 'Property';

  const receiptUrl = (path: string) =>
    supabase.storage.from('rent-receipts').getPublicUrl(path).data.publicUrl;

  return (
    <div className="space-y-6">
      {drafts.map(bill => (
        <Card key={bill.id} className="border-primary">
          <CardHeader>
            <CardTitle>Billing due — {propertyName(bill)}</CardTitle>
            <CardDescription>
              {bill.period}: add this month's expenses, then send the bill to your tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillExpenseForm
              rentAmount={Number(bill.rent_amount)}
              sending={sendBill.isPending && sendBill.variables?.billId === bill.id}
              sendBlockedReason={hasSubaccount ? undefined
                : 'Complete Rent Collection setup (bank details) before sending — the payment needs somewhere to go.'}
              onSend={(lineItems) =>
                sendBill.mutate({ billId: bill.id, lineItems }, {
                  onSuccess: () => toast({ title: 'Bill sent', description: 'Your tenant has been notified.' }),
                  onError: (e: Error) => toast({ title: 'Could not send', description: e.message, variant: 'destructive' }),
                })}
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle>Bills</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {billsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {!billsQuery.isLoading && rest.length === 0 && drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No bills yet. Two days before month-end you'll be asked for billing information here.
            </p>
          ) : null}
          {rest.map(bill => (
            <div key={bill.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">{propertyName(bill)} — {bill.period}</p>
                <p className="text-xs text-muted-foreground">{fmtR(Number(bill.total_amount))}</p>
              </div>
              <div className="flex items-center gap-2">
                {bill.status === 'paid'
                  ? <Badge className="bg-green-600 text-white">Paid</Badge>
                  : <Badge variant="secondary">Sent — awaiting payment</Badge>}
                {bill.status === 'paid' ? (
                  bill.receipt_pdf_path ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={receiptUrl(bill.receipt_pdf_path)} target="_blank" rel="noreferrer">Receipt</a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Receipt generating…</span>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

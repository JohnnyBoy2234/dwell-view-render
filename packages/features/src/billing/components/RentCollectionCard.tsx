// @ts-nocheck
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Landmark, Loader2 } from 'lucide-react';

// Self-contained banking form. The lease flow's "banking form" lives inline in
// Step04DepositFees (wizard-coupled, deposit/fee fields mixed in, free-text bank
// with no Paystack bank-code picker) plus SALeaseWizard's submit handler — it is
// not an importable, self-contained component. So this card provides its own
// minimal form that matches the real edge-function contract: fetch the Paystack
// bank list via `list-paystack-banks` to obtain a settlement bank CODE, then
// submit { bankName: <code>, accountNumber, accountHolderName } to
// `create-paystack-subaccount` (which passes bankName as Paystack settlement_bank).
export function RentCollectionCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['landlord-subaccount', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles').select('paystack_subaccount_code').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const active = !!profile?.paystack_subaccount_code;

  const testMode = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY ?? '').startsWith('pk_test');

  const { data: banks, isLoading: banksLoading } = useQuery({
    queryKey: ['paystack-banks'],
    enabled: !!user && !active,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('list-paystack-banks');
      if (error) throw error;
      return (data?.banks ?? []) as { name: string; code: string }[];
    },
  });

  const [bankCode, setBankCode] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = !!bankCode && !!accountHolder.trim() && !!accountNumber.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-paystack-subaccount', {
        body: {
          bankName: bankCode,
          accountNumber: accountNumber.trim(),
          accountHolderName: accountHolder.trim(),
        },
      });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || 'Setup failed');

      await queryClient.invalidateQueries({ queryKey: ['landlord-subaccount', user.id] });
      toast({ title: 'Rent collection active', description: 'Tenants can now pay rent in-app.' });
    } catch (e: any) {
      toast({
        title: 'Could not set up rent collection',
        description: e?.message || 'Please check your details and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Landmark className="h-6 w-6 text-primary" />
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            Rent collection
            {testMode ? <Badge className="bg-amber-500 text-white">TEST MODE</Badge> : null}
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Checking…' : active
              ? 'Active — rent is paid straight to your bank account'
              : 'Add your bank details so tenants can pay rent in-app'}
          </CardDescription>
        </div>
        {active ? <Badge className="ml-auto bg-green-600 text-white">Active</Badge>
                : <Badge className="ml-auto" variant="destructive">Set up</Badge>}
      </CardHeader>
      <CardContent>
        {active ? (
          <p className="text-sm text-muted-foreground">
            Your payout account is set up. Rent paid in-app settles directly to your bank account.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rc-bank">Bank</Label>
              <Select value={bankCode} onValueChange={setBankCode} disabled={banksLoading || submitting}>
                <SelectTrigger id="rc-bank">
                  <SelectValue placeholder={banksLoading ? 'Loading banks…' : 'Select your bank'} />
                </SelectTrigger>
                <SelectContent>
                  {(banks ?? []).map((b) => (
                    <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-holder">Account holder</Label>
              <Input
                id="rc-holder"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="Account holder name"
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rc-account">Account number</Label>
              <Input
                id="rc-account"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="1234567890"
                inputMode="numeric"
                disabled={submitting}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set up rent collection'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

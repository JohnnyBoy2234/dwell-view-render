import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { PaystackOnboarding } from '@/components/payments/PaystackOnboarding';
import { PaymentRequestButton } from '@/components/payments/PaymentRequestButton';
import { useToast } from '@/hooks/use-toast';

interface PaymentsTabProps {
  propertyId: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_type: string;
  status: string;
  payment_date: string | null;
  due_date: string;
  paystack_reference: string | null;
  tenant_profile: {
    display_name: string;
  } | null;
  [key: string]: any; // Allow additional properties from Supabase
}

interface Tenancy {
  id: string;
  monthly_rent: number;
  security_deposit: number;
  lease_status: string;
  tenant_profile: {
    display_name: string;
  } | null;
}

export function PaymentsTab({ propertyId }: PaymentsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasPaymentSetup, setHasPaymentSetup] = useState<boolean | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tenancies, setTenancies] = useState<Tenancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPaymentSetup();
    fetchPayments();
    fetchTenancies();
  }, [propertyId, user]);

  const checkPaymentSetup = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('paystack_subaccount_code')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setHasPaymentSetup(!!data?.paystack_subaccount_code);
    } catch (error) {
      console.error('Error checking payment setup:', error);
      setHasPaymentSetup(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          tenant_profile:profiles!payments_tenant_id_fkey (
            display_name
          )
        `)
        .eq('landlord_id', user?.id)
        .in('tenancy_id', await getTenancyIdsForProperty())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as any);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const fetchTenancies = async () => {
    try {
      const { data, error } = await supabase
        .from('tenancies')
        .select(`
          id,
          monthly_rent,
          security_deposit,
          lease_status,
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name
          )
        `)
        .eq('property_id', propertyId)
        .eq('landlord_id', user?.id);

      if (error) throw error;
      setTenancies(data || []);
    } catch (error) {
      console.error('Error fetching tenancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTenancyIdsForProperty = async () => {
    const { data } = await supabase
      .from('tenancies')
      .select('id')
      .eq('property_id', propertyId)
      .eq('landlord_id', user?.id);
    
    return data?.map(t => t.id) || [];
  };

  const handleSetupComplete = () => {
    setHasPaymentSetup(true);
    toast({
      title: "Payment Setup Complete",
      description: "You can now start collecting rent payments!"
    });
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show onboarding if payment setup is not complete
  if (hasPaymentSetup === false) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Set Up Payment Collection</CardTitle>
            <CardDescription>
              Connect your bank account to start collecting rent payments directly from tenants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaystackOnboarding onSetupComplete={handleSetupComplete} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Setup Complete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Collection Active
          </CardTitle>
          <CardDescription>
            Your bank account is connected and ready to receive payments
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Active Tenancies - Payment Requests */}
      {tenancies.filter(t => t.lease_status === 'active').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Request Payments</CardTitle>
            <CardDescription>Send payment requests to your tenants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tenancies
                .filter(t => t.lease_status === 'active')
                .map((tenancy) => (
                  <div key={tenancy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{tenancy.tenant_profile?.display_name || 'Unknown Tenant'}</p>
                      <p className="text-sm text-muted-foreground">
                        Monthly Rent: R{tenancy.monthly_rent.toLocaleString()}
                        {tenancy.security_deposit > 0 && ` • Security Deposit: R${tenancy.security_deposit.toLocaleString()}`}
                      </p>
                    </div>
                    <PaymentRequestButton
                      tenancyId={tenancy.id}
                      monthlyRent={tenancy.monthly_rent}
                      securityDeposit={tenancy.security_deposit}
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Track all payments for this property</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No payments yet</h3>
              <p className="text-muted-foreground">
                Payment history will appear here once tenants start making payments
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.tenant_profile?.display_name || 'Unknown Tenant'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell>R{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(payment.status)}
                        {getPaymentStatusBadge(payment.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.payment_date 
                        ? new Date(payment.payment_date).toLocaleDateString()
                        : `Due ${new Date(payment.due_date).toLocaleDateString()}`
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
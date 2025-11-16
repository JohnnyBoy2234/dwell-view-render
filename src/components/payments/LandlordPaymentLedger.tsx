import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function LandlordPaymentLedger() {
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['landlord-payments', selectedProperty],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = (supabase as any)
        .from('payments')
        .select(`
          *,
          tenancies!inner(
            reference_code,
            properties!inner(title, location)
          ),
          profiles!payments_tenant_id_fkey(display_name)
        `)
        .eq('landlord_id', user.id)
        .order('due_date', { ascending: false });

      if (selectedProperty) {
        query = query.eq('tenancies.property_id', selectedProperty);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const { data: properties } = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('properties')
        .select('id, title, location')
        .filter('landlord_id', 'eq', user.id);

      if (error) throw error;
      return (data as any) || [];
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      verified: { variant: 'default', icon: CheckCircle, label: 'Verified' },
      processing: { variant: 'secondary', icon: Clock, label: 'Processing' },
      pending: { variant: 'outline', icon: Clock, label: 'Pending' },
      failed: { variant: 'destructive', icon: AlertCircle, label: 'Failed' },
      overdue: { variant: 'destructive', icon: AlertCircle, label: 'Overdue' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(cents / 100);
  };

  const viewProof = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('proof-of-payment')
      .createSignedUrl(filePath, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Ledger</h2>
          <p className="text-muted-foreground">Track all tenant payments and verifications</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSelectedProperty(null)}>
            All Properties
          </Button>
          {properties?.slice(0, 3).map((property) => (
            <Button
              key={property.id}
              variant={selectedProperty === property.id ? 'default' : 'outline'}
              onClick={() => setSelectedProperty(property.id)}
            >
              {property.title || property.location}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
          <CardDescription>
            {payments?.length || 0} payment records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No payments recorded yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.due_period_yyyymm}
                    </TableCell>
                    <TableCell>
                      {payment.tenancies?.properties?.title || payment.tenancies?.properties?.location}
                    </TableCell>
                    <TableCell>
                      {payment.profiles?.display_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {formatAmount(payment.expected_amount_cents)}
                    </TableCell>
                    <TableCell>
                      {payment.paid_amount_cents ? formatAmount(payment.paid_amount_cents) : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      {payment.verification_confidence ? (
                        <span className={
                          payment.verification_confidence >= 0.9 ? 'text-green-600' :
                          payment.verification_confidence >= 0.7 ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {Math.round(payment.verification_confidence * 100)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {payment.proof_file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewProof(payment.proof_file_path)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
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

import { useState } from 'react';
import { CreditCard, Download, Calendar, Clock, CheckCircle } from 'lucide-react';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@mzanzihomes/ui/components/tabs';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';

export default function TenantPayments() {
  const { rentDue, tenantProperty, loading } = useTenantDashboard();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownloadReceipt = async (receiptId: string) => {
    setDownloading(receiptId);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setDownloading(null);
  };

  const paymentHistory = [
    {
      id: '1',
      date: '2024-01-01',
      amount: 15000,
      type: 'Monthly Rent',
      status: 'paid',
      method: 'EFT',
      reference: 'RENT-JAN-2024',
    },
    {
      id: '2',
      date: '2023-12-01',
      amount: 15000,
      type: 'Monthly Rent',
      status: 'paid',
      method: 'Credit Card',
      reference: 'RENT-DEC-2023',
    },
    {
      id: '3',
      date: '2023-12-15',
      amount: 2500,
      type: 'Utilities',
      status: 'paid',
      method: 'EFT',
      reference: 'UTIL-DEC-2023',
    },
    {
      id: '4',
      date: '2023-11-01',
      amount: 15000,
      type: 'Monthly Rent',
      status: 'paid',
      method: 'EFT',
      reference: 'RENT-NOV-2023',
    },
  ];

  const upcomingPayments = [
    {
      id: '1',
      dueDate: '2024-02-01',
      amount: 15000,
      type: 'Monthly Rent',
      status: 'upcoming',
    },
    {
      id: '2',
      dueDate: '2024-02-15',
      amount: 2500,
      type: 'Utilities (Estimated)',
      status: 'estimated',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded"></div>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title lives in the dashboard app bar */}
      <p className="text-sm text-muted-foreground">
        Manage your rent payments and view payment history
      </p>

      {/* Current Rent Due Card */}
      {rentDue && (
        <Card className={`border-l-4 ${
          rentDue.status === 'overdue' 
            ? 'border-l-destructive bg-destructive/5' 
            : 'border-l-earth-warm bg-earth-warm/5'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RIcon className="h-7 w-7 text-ocean-blue" />
                  Rent Due
                </CardTitle>
                <CardDescription>
                  Due date: {new Date(rentDue.dueDate).toLocaleDateString()}
                </CardDescription>
              </div>
              <Badge 
                variant={rentDue.status === 'overdue' ? 'destructive' : 'secondary'}
                className={rentDue.status === 'overdue' ? '' : 'bg-earth-warm text-white'}
              >
                {rentDue.status === 'overdue' ? 'Overdue' : 'Due Soon'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-ocean-blue">
                  R{rentDue.amount.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  {rentDue.status === 'overdue' 
                    ? `${Math.ceil((new Date().getTime() - new Date(rentDue.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue`
                    : `Due in ${Math.ceil((new Date(rentDue.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`
                  }
                </p>
              </div>
              <Button 
                size="lg" 
                className="bg-ocean-blue hover:bg-ocean-blue-dark"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RIcon className="h-7 w-7 text-success-green" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid (2024)</p>
                <p className="text-xl font-bold">R{(15000).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-ocean-blue" />
              <div>
                <p className="text-sm text-muted-foreground">Next Payment</p>
                <p className="text-xl font-bold">Feb 1</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success-green" />
              <div>
                <p className="text-sm text-muted-foreground">On-time Payments</p>
                <p className="text-xl font-bold">100%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>
        
        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4">
            {paymentHistory.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-success-green/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-success-green" />
                      </div>
                      <div>
                        <p className="font-semibold">{payment.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString()} • {payment.method}
                        </p>
                        <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">R{payment.amount.toLocaleString()}</p>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-success-green text-white">Paid</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReceipt(payment.id)}
                          disabled={downloading === payment.id}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {downloading === payment.id ? 'Downloading...' : 'Receipt'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid gap-4">
            {upcomingPayments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-earth-warm/10 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-earth-warm" />
                      </div>
                      <div>
                        <p className="font-semibold">{payment.type}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(payment.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">R{payment.amount.toLocaleString()}</p>
                      <Badge 
                        variant={payment.status === 'estimated' ? 'secondary' : 'outline'}
                        className={payment.status === 'estimated' ? 'bg-muted' : 'border-earth-warm text-earth-warm'}
                      >
                        {payment.status === 'estimated' ? 'Estimated' : 'Due'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>
                Choose how you'd like to pay your rent and other charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-ocean-blue" />
                      <div>
                        <p className="font-semibold">Electronic Funds Transfer (EFT)</p>
                        <p className="text-sm text-muted-foreground">Direct bank transfer</p>
                      </div>
                    </div>
                    <Badge className="bg-success-green text-white">Preferred</Badge>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Credit/Debit Card</p>
                        <p className="text-sm text-muted-foreground">Instant payment with processing fee</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Setup</Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">Automatic Payments</p>
                        <p className="text-sm text-muted-foreground">Set up recurring payments</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Enable</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
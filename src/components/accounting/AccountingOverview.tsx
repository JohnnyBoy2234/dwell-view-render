import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounting } from '@/hooks/useAccounting';
import { useUserProperties } from '@/hooks/useUserProperties';
import { Plus, FileText, Receipt, TrendingUp, TrendingDown, AlertCircle, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
import { format, startOfMonth, subMonths } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AccountingNavigation } from '@/components/dashboard/AccountingNavigation';
import { AIInsightsCard } from '@/components/accounting/AIInsightsCard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export function AccountingOverview() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const { transactions, loading, fetchTransactions, calculateKPIs, getMonthlyData, getCategoryData } = useAccounting();
  const { properties } = useUserProperties();
  const { toast } = useToast();
  const [sendingReminder, setSendingReminder] = useState(false);
  const [rangeMonths, setRangeMonths] = useState('12');
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [tempAmount, setTempAmount] = useState<number>(0);
  // Sample data fallbacks for charts/KPIs
  const sampleMonths = ['Jun','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
  const sampleIncome = [4200,6100,4800,6400,5600,8200,6900,7800,6000];
  const sampleExpenses = [1800,3200,2600,2400,3600,3000,2100,3300,2200];

  useEffect(() => {
    const month = new Date(selectedMonth + '-01');
    fetchTransactions(month, selectedProperty);
  }, [selectedMonth, selectedProperty]);

  useEffect(() => {
    const loadChartData = async () => {
      const monthly = await getMonthlyData(6);
      const category = getCategoryData(transactions);
      setMonthlyData(monthly);
      setCategoryData(category);
    };
    loadChartData();
  }, [transactions]);

  const kpis = calculateKPIs(transactions);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Accounting Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6">
      {/* Header */}
      <div>
        <h2 className="text-[30px] font-bold">Accounting</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-full md:w-[240px] h-10">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>{property.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={rangeMonths} onValueChange={setRangeMonths}>
          <SelectTrigger className="w-full md:w-[240px] h-10">
            <SelectValue placeholder="Last 12 Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12">Last 12 Months</SelectItem>
            <SelectItem value="6">Last 6 Months</SelectItem>
            <SelectItem value="3">Last 3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 items-center">
        <Button variant="outline" onClick={() => navigate('/dashboard/accounting')}>Overview</Button>
        <Button onClick={() => setShowIncomeModal(true)}>Add Income</Button>
        <Button onClick={() => setShowExpenseModal(true)}>Add Expense</Button>
        <Button variant="outline" onClick={() => setShowInvoiceModal(true)}>Generate Tax Invoice</Button>
        <Button
          variant="outline"
          disabled={selectedProperty === 'all' || sendingReminder}
          onClick={async () => {
            if (selectedProperty === 'all') {
              toast({ title: 'Select a property', description: 'Choose a property to notify its tenant.' });
              return;
            }
            try {
              setSendingReminder(true);
              const { data: tenancy } = await supabase
                .from('tenancies')
                .select('tenant_id')
                .eq('property_id', selectedProperty)
                .limit(1)
                .maybeSingle();
              if (!tenancy?.tenant_id) {
                toast({ variant: 'destructive', title: 'No tenant found', description: 'This property has no active tenant.' });
                setSendingReminder(false);
                return;
              }
              const { error } = await supabase.functions.invoke('send-payment-reminder', {
                body: { tenant_id: tenancy.tenant_id, property_id: selectedProperty }
              });
              if (error) throw error;
              toast({ title: 'Reminder sent', description: 'The tenant has been notified via app and email.' });
            } catch (e: any) {
              toast({ variant: 'destructive', title: 'Failed to send reminder', description: e?.message || 'Please try again.' });
            } finally {
              setSendingReminder(false);
            }
          }}
        >
          {sendingReminder ? 'Sending…' : 'Send Reminder'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.rentCollected)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.expenses)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.netIncome)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section follows */}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expense (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.slice(0, 6).map((transaction) => {
              const property = properties.find(p => p.id === transaction.property_id);
              return (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-success-green' : 'bg-destructive'}`} />
                    <div>
                      <p className="font-medium">{transaction.category || transaction.vendor}</p>
                      <p className="text-sm text-muted-foreground">
                        {property?.title || 'No Property'} • {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'income' ? 'text-success-green' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      VAT: {transaction.vat_percent}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link to="/dashboard/accounting/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Link>
        </Button>
        
        <Button variant="outline" asChild>
          <Link to="/dashboard/accounting/transactions">
            <FileText className="w-4 h-4 mr-2" />
            View All Transactions
          </Link>
        </Button>
        
        {/* SARS Summary removed per request */}
        
        <Button variant="outline" asChild>
          <Link to="/dashboard/invoices/tax">
            <FileText className="w-4 h-4 mr-2" />
            Generate Tax Invoice
          </Link>
        </Button>
      </div>
    </div>
  );
}
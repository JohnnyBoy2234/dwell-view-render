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
import { format, subDays, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getDefaultVATPercent } from '@/types/accounting';
import { AIInsightsCard } from '@/components/accounting/AIInsightsCard';
import { AccountingNav } from './AccountingNav';
import { AccountingHeader } from './AccountingHeader';
import { PROPERTY_CARD_STYLES } from '@/constants/propertyCardConstants';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

interface AccountingOverviewProps {
  defaultPropertyId?: string;
}

export function AccountingOverview({ defaultPropertyId }: AccountingOverviewProps) {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedProperty, setSelectedProperty] = useState(defaultPropertyId || 'all');
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const { transactions, loading, fetchTransactions, calculateKPIs, getMonthlyData, getCategoryData, createTransaction } = useAccounting();
  const { properties } = useUserProperties();
  const { toast } = useToast();
  const [sendingReminder, setSendingReminder] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [txnType, setTxnType] = useState<'income' | 'expense'>('income');
  const [txnAmount, setTxnAmount] = useState<number>(0);
  const [txnDate, setTxnDate] = useState<string>('');
  const [txnPropertyId, setTxnPropertyId] = useState<string>('all');
  const [txnCategory, setTxnCategory] = useState<string>('General');
  const [txnNote, setTxnNote] = useState<string>('');
  const [txnVatPercent, setTxnVatPercent] = useState<number>(0);
  const [txnVendor, setTxnVendor] = useState<string>('');
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Filter transactions based on selected date range
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
  });

  // Calculate KPIs based on filtered transactions
  const kpis = calculateKPIs(filteredTransactions);

  // Generate date range label
  const getDateRangeLabel = () => {
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
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
    <div className="space-y-6 px-6 pt-6">
      {/* SwiftBooks Header with Navigation */}
      <AccountingHeader subtitle="Accounting">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch pt-4">
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
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Input
              type="date"
              value={format(dateRange.from, 'yyyy-MM-dd')}
              onChange={(e) => {
                const newFrom = parseISO(e.target.value);
                setDateRange(prev => ({
                  from: newFrom,
                  to: isAfter(prev.to, newFrom) ? prev.to : addDays(newFrom, 1)
                }));
              }}
              className="h-10 w-full md:w-auto"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              value={format(dateRange.to, 'yyyy-MM-dd')}
              onChange={(e) => {
                const newTo = parseISO(e.target.value);
                setDateRange(prev => ({
                  from: isBefore(prev.from, newTo) ? prev.from : subDays(newTo, 1),
                  to: newTo
                }));
              }}
              className="h-10 w-full md:w-auto"
              min={format(addDays(dateRange.from, 1), 'yyyy-MM-dd')}
            />
          </div>
        </div>

        {/* Navigation */}
        <AccountingNav
          onAddIncome={() => {
            setTxnType('income');
            setTxnAmount(0);
            setTxnDate('');
            setTxnPropertyId(selectedProperty);
            setTxnCategory(INCOME_CATEGORIES[0] || 'Rent');
            setTxnVatPercent(0);
            setTxnVendor(localStorage.getItem('swiftbooks:last_income_payer') || '');
            setTxnNote('');
            setShowIncomeModal(true);
          }}
          onAddExpense={() => {
            setTxnType('expense');
            setTxnAmount(0);
            setTxnDate('');
            setTxnPropertyId(selectedProperty);
            const defaultCat = EXPENSE_CATEGORIES[0] || 'Maintenance';
            setTxnCategory(defaultCat);
            setTxnVatPercent(getDefaultVATPercent(defaultCat));
            setTxnVendor(localStorage.getItem('swiftbooks:last_expense_vendor') || '');
            setTxnNote('');
            setShowExpenseModal(true);
          }}
        />
      </AccountingHeader>

      {/* Payment Reminder - Separate row for better mobile UX */}
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
        className="w-full sm:w-auto h-11 text-sm font-medium"
      >
        <Bell className="w-4 h-4 mr-2" />
        {sendingReminder ? 'Sending…' : 'Send Payment Reminder'}
      </Button>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Income</h3>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-semibold">{formatCurrency(kpis.rentCollected)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Last 30 days
            </div>
          </div>
        </div>
        
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Total Expenses</h3>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-2xl font-semibold">{formatCurrency(kpis.expenses)}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Last 30 days
            </div>
          </div>
        </div>
        
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Net Profit</h3>
              {kpis.netIncome >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className={`text-2xl font-semibold ${kpis.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(kpis.netIncome)}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {kpis.netIncome >= 0 ? 'Profit' : 'Loss'} this period
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section follows */}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Income vs Expense</h3>
              <span className="text-xs text-muted-foreground">{getDateRangeLabel()}</span>
            </div>
            <div className="flex-1">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(value) => `R${value}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        padding: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Bar dataKey="income" fill="#22c55e" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Expense by Category Chart */}
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Expense by Category</h3>
              <span className="text-xs text-muted-foreground">{getDateRangeLabel()}</span>
            </div>
            <div className="flex-1">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke="hsl(var(--background))"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        padding: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Legend 
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      wrapperStyle={{
                        paddingLeft: '1rem',
                        fontSize: '0.75rem',
                        color: 'hsl(var(--muted-foreground))'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Income Modal */}
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Amount (R)" value={txnAmount || ''} onChange={(e) => setTxnAmount(parseFloat(e.target.value) || 0)} />
            <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            <Select value={txnPropertyId} onValueChange={setTxnPropertyId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={txnCategory} onValueChange={(v) => { setTxnCategory(v); setTxnVatPercent(0); }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {(INCOME_CATEGORIES as readonly string[]).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="VAT %" value={txnVatPercent} onChange={(e) => setTxnVatPercent(parseFloat(e.target.value) || 0)} />
            <Input placeholder="Payer Name" value={txnVendor} onChange={(e) => setTxnVendor(e.target.value)} />
            <Input placeholder="Note" value={txnNote} onChange={(e) => setTxnNote(e.target.value)} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowIncomeModal(false)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  const payload = {
                    type: 'income' as const,
                    date: txnDate || new Date().toISOString().slice(0,10),
                    amount: txnAmount,
                    vat_percent: txnVatPercent || 0,
                    category: txnCategory,
                    property_id: txnPropertyId === 'all' ? null : txnPropertyId,
                    vendor: txnVendor || undefined,
                    description: txnNote,
                    billable: false,
                  };
                  const saved = await createTransaction(payload as any);
                  if (saved) toast({ title: 'Income added' });
                  if (txnVendor) localStorage.setItem('swiftbooks:last_income_payer', txnVendor);
                } finally {
                  setShowIncomeModal(false);
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Amount (R)" value={txnAmount || ''} onChange={(e) => setTxnAmount(parseFloat(e.target.value) || 0)} />
            <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            <Select value={txnPropertyId} onValueChange={setTxnPropertyId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Property" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={txnCategory} onValueChange={(v) => { setTxnCategory(v); setTxnVatPercent(getDefaultVATPercent(v)); }}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {(EXPENSE_CATEGORIES as readonly string[]).map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="VAT %" value={txnVatPercent} onChange={(e) => setTxnVatPercent(parseFloat(e.target.value) || 0)} />
            <Input placeholder="Payee/Vendor" value={txnVendor} onChange={(e) => setTxnVendor(e.target.value)} />
            <Input placeholder="Note" value={txnNote} onChange={(e) => setTxnNote(e.target.value)} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
              <Button onClick={async () => {
                try {
                  const payload = {
                    type: 'expense' as const,
                    date: txnDate || new Date().toISOString().slice(0,10),
                    amount: txnAmount,
                    vat_percent: txnVatPercent || 0,
                    category: txnCategory,
                    property_id: txnPropertyId === 'all' ? null : txnPropertyId,
                    vendor: txnVendor || undefined,
                    description: txnNote,
                    billable: false,
                  };
                  const saved = await createTransaction(payload as any);
                  if (saved) toast({ title: 'Expense added' });
                  if (txnVendor) localStorage.setItem('swiftbooks:last_expense_vendor', txnVendor);
                } finally {
                  setShowExpenseModal(false);
                }
              }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

    </div>
  );
}
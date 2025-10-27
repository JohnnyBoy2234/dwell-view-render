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
import { format, subDays, subMonths, parseISO, isBefore, isAfter, addDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, getDefaultVATPercent } from '@/types/accounting';
import { AIInsightsCard } from '@/components/accounting/AIInsightsCard';
import { AccountingNav } from './AccountingNav';
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
  // Initialize with previous month by default
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: new Date(now.getFullYear(), now.getMonth(), 0)
    };
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

  // Determine which preset matches the current date range
  const getDateRangePreset = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);
    
    // Check fiscal year (March 1 to Feb 28/29)
    const currentYear = now.getFullYear();
    const fiscalYearStart = new Date(now.getMonth() >= 2 ? currentYear : currentYear - 1, 2, 1);
    
    if (dateRange.from.getTime() === startOfMonth.getTime() && dateRange.to >= now) {
      return 'this-month';
    } else if (dateRange.from.getTime() === lastMonth.getTime() && 
               dateRange.to.getTime() === endOfLastMonth.getTime()) {
      return 'last-month';
    } else if (dateRange.from >= sixMonthsAgo && dateRange.to >= now) {
      return 'last-6-months';
    } else if (dateRange.from >= twelveMonthsAgo && dateRange.to >= now) {
      return 'last-12-months';
    } else if (dateRange.from.getTime() === fiscalYearStart.getTime() && dateRange.to >= now) {
      return 'fiscal-year';
    }
    
    return 'custom';
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
    <div className="space-y-6 p-6">
      {/* Subtitle and Content Card */}
      <Card className={PROPERTY_CARD_STYLES.CARD}>
        <div className="p-6 space-y-4">
          {/* Subtitle */}
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl font-normal text-black dark:text-white">Accounting</h2>
            <p className="text-black/80 dark:text-white/80">Track your property finances and generate reports</p>
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
        </div>
      </Card>

      {/* Payment Reminder Banner */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ocean-blue/10 text-ocean-blue flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-black dark:text-white">Send Payment Reminder</div>
              <div className="text-sm text-black/70 dark:text-white/70">Notify a tenant instantly via app and email</div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={sendingReminder || selectedProperty === 'all'}
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
                    .eq('status', 'active')
                    .limit(1)
                    .maybeSingle();
                  if (!tenancy?.tenant_id) {
                    toast({ variant: 'destructive', title: 'No active tenant', description: 'This property has no active tenant.' });
                    setSendingReminder(false);
                    return;
                  }
                  const { error } = await supabase.functions.invoke('send-payment-reminder', {
                    body: { tenant_id: tenancy.tenant_id, property_id: selectedProperty }
                  });
                  if (error) throw error;
                  toast({ title: 'Reminder sent', description: 'Tenant notified via app and email.' });
                } catch (e: any) {
                  toast({ variant: 'destructive', title: 'Failed to send reminder', description: e?.message || 'Please try again.' });
                } finally {
                  setSendingReminder(false);
                }
              }}
              className="bg-ocean-blue hover:bg-ocean-blue-dark text-white"
            >
              {sendingReminder ? 'Sending…' : 'Send Reminder'}
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Heading */}
      <div className="text-center">
        <h2 className="text-2xl font-normal text-black dark:text-white">Overview</h2>
      </div>

      {/* Date Range Dropdown */}
      <div className="flex justify-center">
        <Select
          value={getDateRangePreset()}
          onValueChange={(value) => {
            const now = new Date();
            let newFrom = new Date();
            let newTo = new Date();

            switch (value) {
              case 'this-month':
                newFrom = new Date(now.getFullYear(), now.getMonth(), 1);
                newTo = now;
                break;
              case 'last-month':
                newFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                newTo = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
              case 'last-6-months':
                newFrom = subMonths(now, 6);
                newTo = now;
                break;
              case 'last-12-months':
                newFrom = subMonths(now, 12);
                newTo = now;
                break;
              case 'fiscal-year':
                // Assuming fiscal year starts March 1st
                const currentYear = now.getFullYear();
                const fiscalYearStart = new Date(now.getMonth() >= 2 ? currentYear : currentYear - 1, 2, 1);
                newFrom = fiscalYearStart;
                newTo = now;
                break;
              default:
                newFrom = subDays(now, 30);
                newTo = now;
            }

            setDateRange({
              from: newFrom,
              to: newTo
            });
          }}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Previous Month</SelectItem>
            <SelectItem value="last-6-months">Last 6 Months</SelectItem>
            <SelectItem value="last-12-months">Last 12 Months</SelectItem>
            <SelectItem value="fiscal-year">Current Fiscal Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Income</h3>
              <div className="p-1.5 rounded-full bg-blue-500/20">
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-white">{formatCurrency(kpis.rentCollected)}</div>
            <div className="mt-2 text-xs text-gray-400">
              {getDateRangeLabel()}
            </div>
          </div>
        </div>
        
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Total Expenses</h3>
              <div className="p-1.5 rounded-full bg-blue-500/20">
                <TrendingDown className="h-4 w-4 text-blue-300" />
              </div>
            </div>
            <div className="text-2xl font-semibold text-white">{formatCurrency(kpis.expenses)}</div>
            <div className="mt-2 text-xs text-gray-400">
              {getDateRangeLabel()}
            </div>
          </div>
        </div>
        
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-400">Net Profit</h3>
              <div className={`p-1.5 rounded-full ${kpis.netIncome >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                {kpis.netIncome >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            <div className={`text-2xl font-semibold ${kpis.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(kpis.netIncome)}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {kpis.netIncome >= 0 ? 'Profit' : 'Loss'} this period
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section follows */}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Income vs Expense</h3>
              <span className="text-xs text-gray-400">{getDateRangeLabel()}</span>
            </div>
            <div className="flex-1">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
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
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '0.5rem'
                      }}
                      labelStyle={{ color: '#E5E7EB' }}
                    />
                    <Bar 
                      dataKey="income" 
                      fill="#60a5fa" 
                      name="Income"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="expense" 
                      fill="#3b82f6" 
                      name="Expense"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Income & Expense Trend */}
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Income & Expense Trend</h3>
              <span className="text-xs text-gray-400">{getDateRangeLabel()}</span>
            </div>
            <div className="flex-1">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e40af" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#1e40af" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#a0aec0"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <YAxis 
                      stroke="#a0aec0"
                      tickFormatter={(value) => `R${value}`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{
                        backgroundColor: '#1a202c',
                        borderColor: '#2d3748',
                        borderRadius: '0.375rem',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'white'
                      }}
                      labelStyle={{ color: '#a0aec0' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                      name="Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#1e40af"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorExpense)"
                      name="Expense"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-xs text-gray-300">Income</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-800"></div>
                <span className="text-xs text-gray-300">Expense</span>
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
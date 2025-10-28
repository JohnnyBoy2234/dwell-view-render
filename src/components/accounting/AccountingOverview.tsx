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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, BarChart, Bar, Pie, PieChart, Label } from 'recharts';
import { ChartContainer, ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

  const { transactions, loading, fetchTransactionsByDateRange, calculateKPIs, getMonthlyDataByRange, getCategoryData, createTransaction } = useAccounting();
  const { properties } = useUserProperties();
  const { toast } = useToast();
  const [sendingReminder, setSendingReminder] = useState(false);
  // Initialize to current month by default
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
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
    fetchTransactionsByDateRange(dateRange.from, dateRange.to, selectedProperty);
  }, [dateRange, selectedProperty, fetchTransactionsByDateRange]);

  // Filter transactions based on selected date range
  const filteredTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= dateRange.from && transactionDate <= dateRange.to;
  });

  // Calculate KPIs based on filtered transactions
  const kpis = calculateKPIs(filteredTransactions);

  useEffect(() => {
    const loadChartData = async () => {
      const monthly = await getMonthlyDataByRange(dateRange.from, dateRange.to, selectedProperty);
      const category = getCategoryData(filteredTransactions);
      setMonthlyData(monthly);
      setCategoryData(category);
    };
    loadChartData();
  }, [transactions, selectedProperty, dateRange, getMonthlyDataByRange, getCategoryData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Generate date range label
  const getDateRangeLabel = () => {
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
  };

  // Determine which preset matches the current date range
  const getDateRangePreset = () => {
    const now = new Date();
    const { from, to } = dateRange;
    
    // All Properties - Year
    const yearStart = new Date(now.getFullYear(), 0, 1);
    if (selectedProperty === 'all' && 
        from.getFullYear() === yearStart.getFullYear() &&
        from.getMonth() === 0 && 
        from.getDate() === 1) {
      return 'all-properties-year';
    }
    
    // This month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    if (from.getTime() === startOfMonth.getTime() && to >= now) {
      return 'this-month';
    }
    
    // Previous month
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    if (from.getTime() === lastMonth.getTime() && 
        to.getTime() === endOfLastMonth.getTime()) {
      return 'last-month';
    }
    
    return 'this-month'; // Default fallback
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
    <div className="min-h-screen bg-gray-900">
      {/* White Top Section */}
      <div className="bg-white">
        <div className="w-full py-6">
          <Card className="bg-white border-0 shadow-none rounded-none">
            <div className="p-8 space-y-6">
              {/* Subtitle */}
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Accounting</h2>
                <p className="text-gray-600">Track your property finances and generate reports</p>
              </div>
          
              {/* Filters */}
              <div className="max-w-4xl mx-auto mb-4">
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger 
                    className="w-full h-12 text-black"
                    style={{
                      border: '1px solid #00f0ff',
                      backgroundColor: '#dbeafe',
                      color: '#000000'
                    }}
                  >
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

              {/* Navigation - Matched Width Section */}
              <div className="max-w-4xl mx-auto">
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
            </div>
          </Card>

          {/* Payment Reminder Banner */}
          <div className="max-w-4xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Send Payment Reminder</div>
                  <div className="text-sm text-gray-600">Notify a tenant instantly via app and email</div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger className="w-[220px] bg-white border-gray-300">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sendingReminder ? 'Sending…' : 'Send Reminder'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dark Bottom Section */}
      <div className="max-w-[1400px] mx-auto px-6 sm:px-8 lg:px-12 py-6 space-y-6">
        {/* Overview Heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Overview</h2>
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
                const currentYear = now.getFullYear();
                const fiscalYearStart = new Date(now.getMonth() >= 2 ? currentYear : currentYear - 1, 2, 1);
                newFrom = fiscalYearStart;
                newTo = now;
                break;
              case 'all-properties-year':
                newFrom = new Date(now.getFullYear(), 0, 1);
                newTo = now;
                setSelectedProperty('all');
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
          <SelectTrigger className="w-full max-w-xs bg-gray-800 border-gray-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="this-month" className="text-white hover:bg-gray-700">Current Month</SelectItem>
            <SelectItem value="last-month" className="text-white hover:bg-gray-700">Previous Month</SelectItem>
            <SelectItem value="last-6-months" className="text-white hover:bg-gray-700">Last 6 Months</SelectItem>
            <SelectItem value="last-12-months" className="text-white hover:bg-gray-700">Last 12 Months</SelectItem>
            <SelectItem value="fiscal-year" className="text-white hover:bg-gray-700">Fiscal Year (Mar-Feb)</SelectItem>
            <SelectItem value="all-properties-year" className="text-white hover:bg-gray-700">All Properties - Year</SelectItem>
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
        {/* Expense Breakdown Pie Chart */}
        <div className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 bg-gray-900 border border-gray-800 shadow-lg rounded-lg overflow-hidden h-full">
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white">Expense Breakdown</h3>
              <span className="text-xs text-gray-400">{getDateRangeLabel()}</span>
            </div>
            <div className="flex-1">
              <div className="h-[250px] sm:h-[300px] w-full min-h-[250px]">
                <ChartContainer
                  config={{
                    amount: { label: "Amount" },
                    "Maintenance": { label: "Maintenance", color: "#3b82f6" },
                    "Utilities (Water/Electricity)": { label: "Utilities", color: "#10b981" },
                    "Rates & Taxes": { label: "Rates & Taxes", color: "#f59e0b" },
                    "Insurance": { label: "Insurance", color: "#ef4444" },
                    "Bank Fees": { label: "Bank Fees", color: "#8b5cf6" },
                    "SwiftRent Subscription": { label: "SwiftRent", color: "#ec4899" },
                    "Other": { label: "Other", color: "#6366f1" },
                  }}
                  className="mx-auto w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData.map((item) => {
                          const getCategoryColor = (category: string) => {
                            switch (category) {
                              case 'Maintenance':
                                return '#3b82f6';
                              case 'Utilities (Water/Electricity)':
                                return '#10b981';
                              case 'Rates & Taxes':
                                return '#f59e0b';
                              case 'Insurance':
                                return '#ef4444';
                              case 'Bank Fees':
                                return '#8b5cf6';
                              case 'SwiftRent Subscription':
                                return '#ec4899';
                              case 'Other':
                                return '#6366f1';
                              default:
                                return '#6366f1';
                            }
                          };
                          
                          return {
                            category: item.category,
                            amount: item.amount,
                            fill: getCategoryColor(item.category)
                          };
                        })}
                        dataKey="amount"
                        nameKey="category"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        <Label
                          content={({ viewBox }) => {
                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                              const total = categoryData.reduce((sum, item) => sum + item.amount, 0);
                              return (
                                <text
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  textAnchor="middle"
                                  dominantBaseline="middle"
                                >
                                  <tspan
                                    x={viewBox.cx}
                                    y={viewBox.cy}
                                    className="fill-white text-2xl font-bold"
                                  >
                                    {formatCurrency(total)}
                                  </tspan>
                                  <tspan
                                    x={viewBox.cx}
                                    y={(viewBox.cy || 0) + 24}
                                    className="fill-gray-400 text-sm"
                                  >
                                    Total Expenses
                                  </tspan>
                                </text>
                              );
                            }
                          }}
                        />
                      </Pie>
                      <ChartLegend
                        content={<ChartLegendContent nameKey="category" />}
                        className="flex flex-wrap gap-2 justify-center text-xs"
                        wrapperStyle={{ paddingTop: '20px' }}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: '1px solid #374151',
                          borderRadius: '0.5rem',
                          color: 'white'
                        }}
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
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
        <Card className="bg-gray-900 border border-gray-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.slice(0, 6).map((transaction) => {
              const property = properties.find(p => p.id === transaction.property_id);
              return (
                <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-800 rounded-lg bg-gray-900">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="font-medium text-white">{transaction.category || transaction.vendor}</p>
                      <p className="text-sm text-gray-400">
                        {property?.title || 'No Property'} • {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${transaction.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                    </p>
                    <p className="text-sm text-gray-500">
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
    </div>
  );
}
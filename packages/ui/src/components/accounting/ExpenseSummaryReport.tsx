import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { useAccounting } from '@/hooks/useAccounting';
import { useUserProperties } from '@/hooks/useUserProperties';
import { Transaction, EXPENSE_CATEGORIES } from '@mzanzihomes/common/types/accounting';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Download, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function ExpenseSummaryReport() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [landlordDetails, setLandlordDetails] = useState({
    name: '',
    idNumber: '',
    contact: '',
    address: '',
  });

  const { transactions, fetchTransactions } = useAccounting();
  const { properties } = useUserProperties();
  const { user } = useAuth();

  useEffect(() => {
    const month = new Date(selectedMonth + '-01');
    fetchTransactions(month, selectedProperty);
  }, [selectedMonth, selectedProperty]);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Filter to only show expenses
  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  // Calculate totals by category
  const categoryTotals = EXPENSE_CATEGORIES.reduce((acc, category) => {
    const total = expenseTransactions
      .filter(t => t.category === category)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    if (total > 0) {
      acc[category] = total;
    }
    return acc;
  }, {} as Record<string, number>);

  const grandTotal = Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);

  const handleDownloadPDF = async () => {
    // Generate PDF using react-pdf
    const { generateExpenseSummaryPDF } = await import('@/components/accounting/PDFGenerator');
    
    await generateExpenseSummaryPDF({
      month: format(new Date(selectedMonth + '-01'), 'MMMM yyyy'),
      landlordDetails,
      transactions: expenseTransactions.map(t => ({
        ...t,
        property_title: properties.find(p => p.id === t.property_id)?.title,
      })),
      categoryTotals,
      grandTotal,
    });
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Property', 'Vendor', 'Category', 'Amount (Incl. VAT)', 'VAT %', 'Billable', 'Notes'];
    const csvData = expenseTransactions.map(transaction => {
      const property = properties.find(p => p.id === transaction.property_id);
      return [
        transaction.date,
        property?.title || 'No Property',
        transaction.vendor || '',
        transaction.category,
        transaction.amount,
        transaction.vat_percent,
        transaction.billable ? 'Y' : 'N',
        transaction.description || '',
      ];
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-summary-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            Landlord Expense Summary – {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
          </h2>
          <div className="flex items-center mt-2">
            <img 
              src="/favicon-32x32.png" 
              alt="MzanziHomes Logo" 
              className="h-6 w-6 mr-2" 
            />
            <span className="text-sm text-muted-foreground">
              mzanzihomes.com – Safe, Simple, Commission-Free Renting
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Landlord Details */}
      <Card>
        <CardHeader>
          <CardTitle>Landlord Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={landlordDetails.name}
                onChange={(e) => setLandlordDetails(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your name"
              />
            </div>
            <div>
              <Label htmlFor="idNumber">ID/Tax Number</Label>
              <Input
                id="idNumber"
                value={landlordDetails.idNumber}
                onChange={(e) => setLandlordDetails(prev => ({ ...prev, idNumber: e.target.value }))}
                placeholder="Enter ID or tax number"
              />
            </div>
            <div>
              <Label htmlFor="contact">Contact</Label>
              <Input
                id="contact"
                value={landlordDetails.contact}
                onChange={(e) => setLandlordDetails(prev => ({ ...prev, contact: e.target.value }))}
                placeholder="Enter contact details"
              />
            </div>
            <div>
              <Label htmlFor="address">Default Property Address</Label>
              <Input
                id="address"
                value={landlordDetails.address}
                onChange={(e) => setLandlordDetails(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter property address"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Property</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Amount (Incl. VAT)</th>
                  <th className="text-center p-3 font-medium">VAT %</th>
                  <th className="text-center p-3 font-medium">Billable</th>
                  <th className="text-left p-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {expenseTransactions.map((transaction) => {
                  const property = properties.find(p => p.id === transaction.property_id);
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                      <td className="p-3">{property?.title || 'No Property'}</td>
                      <td className="p-3">{transaction.vendor || '-'}</td>
                      <td className="p-3">{transaction.category}</td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(Number(transaction.amount))}
                      </td>
                      <td className="p-3 text-center">{transaction.vat_percent}%</td>
                      <td className="p-3 text-center">
                        {transaction.billable ? 'Y' : 'N'}
                      </td>
                      <td className="p-3">{transaction.description || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Summary by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(categoryTotals).map(([category, total]) => (
              <div key={category} className="flex justify-between items-center">
                <span className="font-medium">{category}:</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total Expenses:</span>
                <span className="font-bold text-destructive">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button onClick={handleDownloadPDF}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={handleExportCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
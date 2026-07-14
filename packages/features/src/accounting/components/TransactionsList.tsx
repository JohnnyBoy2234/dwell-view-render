import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { useAccounting } from '../hooks/useAccounting';
import { useUserProperties } from '@mzanzihomes/supabase/hooks/useUserProperties';
import { Transaction } from '@mzanzihomes/common/types/accounting';
import { format, subMonths } from 'date-fns';
import { Download, Trash2, FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TransactionsList() {
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const { transactions, loading, fetchTransactions, deleteTransaction } = useAccounting();
  const { properties } = useUserProperties();

  const itemsPerPage = 20;

  useEffect(() => {
    const month = selectedMonth === 'all' ? undefined : new Date(selectedMonth + '-01');
    const propertyId = selectedProperty === 'all' ? undefined : selectedProperty;
    fetchTransactions(month, propertyId);
  }, [selectedMonth, selectedProperty]);

  const getMonthOptions = () => {
    const options = [{ value: 'all', label: 'All Months' }];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesType = selectedType === 'all' || transaction.type === selectedType;
    const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesCategory && matchesSearch;
  });

  // Get unique categories from transactions
  const categories = Array.from(new Set(transactions.map(t => t.category)));

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    setSelectedTransactions(prev => 
      checked 
        ? [...prev, transactionId]
        : prev.filter(id => id !== transactionId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTransactions(checked ? paginatedTransactions.map(t => t.id) : []);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${selectedTransactions.length} transaction(s)?`);
    if (!confirmed) return;

    for (const id of selectedTransactions) {
      await deleteTransaction(id);
    }
    setSelectedTransactions([]);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Property', 'Type', 'Category', 'Vendor', 'Amount', 'VAT %', 'Billable', 'Description'];
    const csvData = filteredTransactions.map(transaction => {
      const property = properties.find(p => p.id === transaction.property_id);
      return [
        transaction.date,
        property?.title || 'No Property',
        transaction.type,
        transaction.category,
        transaction.vendor || '',
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
    a.download = `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Title lives in the dashboard app bar */}
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title lives in the dashboard app bar */}
      <div className="flex justify-end">
        <Button asChild>
          <Link to="/dashboard/accounting/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
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
              <SelectTrigger>
                <SelectValue placeholder="Property" />
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

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bulk Actions */}
          {selectedTransactions.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedTransactions.length} transaction(s) selected
              </span>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 w-12">
                    <Checkbox
                      checked={selectedTransactions.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">VAT %</th>
                  <th className="p-4">Billable</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((transaction) => {
                  const property = properties.find(p => p.id === transaction.property_id);
                  return (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.id)}
                          onCheckedChange={(checked) => handleSelectTransaction(transaction.id, !!checked)}
                        />
                      </td>
                      <td className="p-4">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {property?.title || 'No Property'}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                          {transaction.type}
                        </Badge>
                      </td>
                      <td className="p-4">{transaction.category}</td>
                      <td className="p-4">{transaction.vendor || '-'}</td>
                      <td className="p-4 text-right font-medium">
                        <span className={transaction.type === 'income' ? 'text-success-green' : 'text-destructive'}>
                          {formatCurrency(Number(transaction.amount))}
                        </span>
                      </td>
                      <td className="p-4">{transaction.vat_percent}%</td>
                      <td className="p-4">
                        {transaction.billable ? (
                          <Badge variant="outline">Y</Badge>
                        ) : (
                          <span className="text-muted-foreground">N</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
                          {transaction.description || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        {transaction.receipt_url ? (
                          <FileText className="w-4 h-4 text-ocean-blue" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAccounting } from '@/hooks/useAccounting';
import { useUserProperties } from '@/hooks/useUserProperties';
import { TransactionFormData, INCOME_CATEGORIES, EXPENSE_CATEGORIES, getDefaultVATPercent } from '@/types/accounting';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function AddTransaction() {
  const navigate = useNavigate();
  const { createTransaction, transactions, calculateKPIs } = useAccounting();
  const { properties } = useUserProperties();

  const [formData, setFormData] = useState<TransactionFormData>({
    type: 'income',
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    vat_percent: 0,
    category: '',
    property_id: null,
    vendor: '',
    description: '',
    billable: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update VAT percentage when category changes
  useEffect(() => {
    if (formData.category && formData.type === 'expense') {
      const defaultVAT = getDefaultVATPercent(formData.category);
      setFormData(prev => ({ ...prev, vat_percent: defaultVAT }));
    }
  }, [formData.category, formData.type]);

  // Reset category when type changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, category: '' }));
  }, [formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createTransaction(formData);
      if (result) {
        navigate('/dashboard/accounting/transactions');
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof TransactionFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentMonthKPIs = calculateKPIs(transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const currentDate = new Date();
    return transactionDate.getMonth() === currentDate.getMonth() && 
           transactionDate.getFullYear() === currentDate.getFullYear();
  }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Add Transaction</h2>
        <Button variant="outline" onClick={() => navigate('/dashboard/accounting')}>
          Back to Overview
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              
              {/* Type Toggle */}
              <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                <Button
                  type="button"
                  variant={formData.type === 'income' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleInputChange('type', 'income')}
                >
                  Income
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'expense' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => handleInputChange('type', 'expense')}
                >
                  Expense
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (Incl. VAT) (ZAR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.type === 'income' 
                        ? INCOME_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))
                        : EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Property */}
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <Select value={formData.property_id || 'none'} onValueChange={(value) => handleInputChange('property_id', value === 'none' ? null : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select property" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Property</SelectItem>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendor */}
                <div className="space-y-2">
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor || ''}
                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                    placeholder="Enter vendor name"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    rows={3}
                  />
                </div>

                {/* VAT Percentage */}
                <div className="space-y-2">
                  <Label htmlFor="vat">VAT %</Label>
                  <Input
                    id="vat"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.vat_percent}
                    onChange={(e) => handleInputChange('vat_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* Billable (only for expenses) */}
                {formData.type === 'expense' && (
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="billable"
                      checked={formData.billable}
                      onCheckedChange={(checked) => handleInputChange('billable', checked)}
                    />
                    <Label htmlFor="billable">Billable to tenant?</Label>
                  </div>
                )}

                {/* Receipt Upload - Placeholder for now */}
                <div className="space-y-2">
                  <Label htmlFor="receipt">Attach Receipt</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    disabled
                    className="opacity-50"
                  />
                  <p className="text-sm text-muted-foreground">File upload coming soon</p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Transaction'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>This Month Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Income:</span>
                <span className="font-medium text-success-green">
                  {formatCurrency(currentMonthKPIs.rentCollected)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expenses:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(currentMonthKPIs.expenses)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-medium">Net Income:</span>
                  <span className={`font-bold ${currentMonthKPIs.netIncome >= 0 ? 'text-success-green' : 'text-destructive'}`}>
                    {formatCurrency(currentMonthKPIs.netIncome)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
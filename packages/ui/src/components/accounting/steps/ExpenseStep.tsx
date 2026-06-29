import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { Input } from '@mzanzihomes/ui/components/input';
import { Label } from '@mzanzihomes/ui/components/label';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@mzanzihomes/ui/components/select';
import { Switch } from '@mzanzihomes/ui/components/switch';
import { useUserProperties } from '@mzanzihomes/features/property'; // ponytail: accounting pulls property list; retire when accounting is sliced
import { WizardExpenseData, EXPENSE_CATEGORIES, getDefaultVATPercent, calculateVATExclusive, calculateVATInclusive } from '@mzanzihomes/common/types/accounting';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface ExpenseStepProps {
  initialExpenses: WizardExpenseData[];
  onComplete: (expenses: WizardExpenseData[]) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function ExpenseStep({ initialExpenses, onComplete, onSkip, onBack }: ExpenseStepProps) {
  const { properties } = useUserProperties();
  
  const [expenses, setExpenses] = useState<WizardExpenseData[]>(initialExpenses);
  const [currentExpense, setCurrentExpense] = useState<WizardExpenseData>({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    vatPercent: 0,
    isVATInclusive: true,
    category: '',
    property_id: null,
    vendor: '',
    description: '',
    billable: false,
  });

  const [vatExclusive, setVatExclusive] = useState(0);
  const [vatAmount, setVatAmount] = useState(0);

  // Update VAT percentage when category changes
  useEffect(() => {
    if (currentExpense.category) {
      const defaultVAT = getDefaultVATPercent(currentExpense.category);
      setCurrentExpense(prev => ({ ...prev, vatPercent: defaultVAT }));
    }
  }, [currentExpense.category]);

  // Calculate VAT amounts when form data changes
  useEffect(() => {
    if (currentExpense.amount && currentExpense.vatPercent) {
      if (currentExpense.isVATInclusive) {
        const exclusive = calculateVATExclusive(currentExpense.amount, currentExpense.vatPercent);
        setVatExclusive(exclusive);
        setVatAmount(currentExpense.amount - exclusive);
      } else {
        const inclusive = calculateVATInclusive(currentExpense.amount, currentExpense.vatPercent);
        setVatExclusive(currentExpense.amount);
        setVatAmount(inclusive - currentExpense.amount);
      }
    } else {
      setVatExclusive(currentExpense.amount);
      setVatAmount(0);
    }
  }, [currentExpense.amount, currentExpense.vatPercent, currentExpense.isVATInclusive]);

  const handleInputChange = (field: keyof WizardExpenseData, value: any) => {
    setCurrentExpense(prev => ({ ...prev, [field]: value }));
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpense.category || currentExpense.amount <= 0) {
      return;
    }

    setExpenses(prev => [...prev, { ...currentExpense }]);
    
    // Reset form but keep date
    setCurrentExpense({
      date: currentExpense.date,
      amount: 0,
      vatPercent: 0,
      isVATInclusive: true,
      category: '',
      property_id: null,
      vendor: '',
      description: '',
      billable: false,
    });
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    onComplete(expenses);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const finalAmount = currentExpense.isVATInclusive 
    ? currentExpense.amount 
    : calculateVATInclusive(currentExpense.amount, currentExpense.vatPercent);

  const totalExpenses = expenses.reduce((sum, expense) => {
    const expenseAmount = expense.isVATInclusive 
      ? expense.amount 
      : calculateVATInclusive(expense.amount, expense.vatPercent);
    return sum + expenseAmount;
  }, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Add Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-6">
              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={currentExpense.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              {/* VAT Inclusive/Exclusive Toggle */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label>Amount Entry Type</Label>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm ${!currentExpense.isVATInclusive ? 'font-medium' : 'text-muted-foreground'}`}>
                      VAT Exclusive
                    </span>
                    <Switch
                      checked={currentExpense.isVATInclusive}
                      onCheckedChange={(checked) => handleInputChange('isVATInclusive', checked)}
                    />
                    <span className={`text-sm ${currentExpense.isVATInclusive ? 'font-medium' : 'text-muted-foreground'}`}>
                      VAT Inclusive
                    </span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount ({currentExpense.isVATInclusive ? 'VAT Inclusive' : 'VAT Exclusive'}) (ZAR)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentExpense.amount || ''}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    required
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
                    value={currentExpense.vatPercent}
                    onChange={(e) => handleInputChange('vatPercent', parseFloat(e.target.value) || 0)}
                  />
                </div>

                {/* VAT Breakdown */}
                {currentExpense.vatPercent > 0 && currentExpense.amount > 0 && (
                  <div className="space-y-2 text-sm bg-muted p-3 rounded">
                    <div className="flex justify-between">
                      <span>VAT Exclusive Amount:</span>
                      <span className="font-medium">{formatCurrency(vatExclusive)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT Amount ({currentExpense.vatPercent}%):</span>
                      <span className="font-medium">{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">VAT Inclusive Total:</span>
                      <span className="font-bold">{formatCurrency(finalAmount)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={currentExpense.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}</SelectContent>
                </Select>
              </div>

              {/* Property */}
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select value={currentExpense.property_id || 'none'} onValueChange={(value) => handleInputChange('property_id', value === 'none' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Property</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title}
                      </SelectItem>
                    ))}</SelectContent>
                </Select>
              </div>

              {/* Vendor */}
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  value={currentExpense.vendor || ''}
                  onChange={(e) => handleInputChange('vendor', e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={currentExpense.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter description"
                  rows={3}
                />
              </div>

              {/* Billable */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="billable"
                  checked={currentExpense.billable}
                  onCheckedChange={(checked) => handleInputChange('billable', checked)}
                />
                <Label htmlFor="billable">Billable to tenant?</Label>
              </div>

              <div className="flex space-x-4">
                <Button type="submit" className="flex-1" disabled={!currentExpense.category || currentExpense.amount <= 0}>
                  Add Expense
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="flex space-x-4 mt-6">
          <Button variant="outline" onClick={onBack}>
            Back to Income
          </Button>
          <Button onClick={handleFinish} disabled={expenses.length === 0}>
            Finish & Review ({expenses.length} expense{expenses.length !== 1 ? 's' : ''})
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Skip Expenses
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Added Expenses ({expenses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expenses added yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expenses.map((expense, index) => {
                  const expenseAmount = expense.isVATInclusive 
                    ? expense.amount 
                    : calculateVATInclusive(expense.amount, expense.vatPercent);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{expense.category}</span>
                          <span className="font-bold text-destructive">{formatCurrency(expenseAmount)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {expense.date} • {expense.vendor || 'No vendor'} 
                          {expense.billable && ' • Billable'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-8 w-8"
                        onClick={() => handleRemoveExpense(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-bold">
                    <span>Total Expenses:</span>
                    <span className="text-destructive">{formatCurrency(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

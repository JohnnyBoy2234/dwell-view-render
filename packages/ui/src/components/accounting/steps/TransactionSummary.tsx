import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Button } from '@mzanzihomes/ui/components/button';
import { WizardIncomeData, WizardExpenseData, calculateVATInclusive } from '@mzanzihomes/common/types/accounting';
import { useUserProperties } from '@mzanzihomes/features/property'; // ponytail: accounting pulls property list; retire when accounting is sliced

interface TransactionSummaryProps {
  income: WizardIncomeData | null;
  expenses: WizardExpenseData[];
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function TransactionSummary({ income, expenses, onBack, onSubmit, isSubmitting }: TransactionSummaryProps) {
  const { properties } = useUserProperties();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPropertyName = (propertyId: string | null) => {
    if (!propertyId) return 'No Property';
    return properties.find(p => p.id === propertyId)?.title || 'Unknown Property';
  };

  const totalIncome = income ? (income.isVATInclusive ? income.amount : calculateVATInclusive(income.amount, income.vatPercent)) : 0;
  const totalExpenses = expenses.reduce((sum, expense) => {
    const amount = expense.isVATInclusive ? expense.amount : calculateVATInclusive(expense.amount, expense.vatPercent);
    return sum + amount;
  }, 0);
  const netAmount = totalIncome - totalExpenses;

  if (!income && expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Transactions to Save</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">You haven't added any income or expense entries.</p>
          <Button variant="outline" onClick={onBack}>
            Go Back to Add Transactions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Summary */}
        {income && (
          <Card>
            <CardHeader>
              <CardTitle className="text-success-green">Income Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{income.date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{income.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Property:</span>
                  <p className="font-medium">{getPropertyName(income.property_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-bold text-success-green">{formatCurrency(totalIncome)}</p>
                </div>
                {income.vendor && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Source/Payer:</span>
                    <p className="font-medium">{income.vendor}</p>
                  </div>
                )}
                {income.description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <p className="font-medium">{income.description}</p>
                  </div>
                )}
                {income.vatPercent > 0 && (
                  <div className="col-span-2 text-xs text-muted-foreground">
                    Entered as {income.isVATInclusive ? 'VAT Inclusive' : 'VAT Exclusive'} • VAT: {income.vatPercent}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expenses Summary */}
        {expenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Expense Entries ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {expenses.map((expense, index) => {
                  const amount = expense.isVATInclusive ? expense.amount : calculateVATInclusive(expense.amount, expense.vatPercent);
                  
                  return (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{expense.category}</span>
                        <span className="font-bold text-destructive">{formatCurrency(amount)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>Date: {expense.date}</span>
                        <span>Property: {getPropertyName(expense.property_id)}</span>
                        {expense.vendor && <span>Vendor: {expense.vendor}</span>}
                        {expense.billable && <span className="text-blue-600">Billable</span>}
                      </div>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground mt-1">{expense.description}</p>
                      )}
                      {expense.vatPercent > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {expense.isVATInclusive ? 'VAT Inclusive' : 'VAT Exclusive'} • VAT: {expense.vatPercent}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-success-green/10 rounded-lg">
              <div className="text-2xl font-bold text-success-green">{formatCurrency(totalIncome)}</div>
              <div className="text-sm text-muted-foreground">Total Income</div>
            </div>
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-success-green' : 'text-destructive'}`}>
                {formatCurrency(netAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Net Amount</div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
              Back to Expenses
            </Button>
            <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Saving Transactions...' : `Save All Transactions (${(income ? 1 : 0) + expenses.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { TransactionWizardState, WizardIncomeData, WizardExpenseData } from '@mzanzihomes/common/types/accounting';
import { IncomeStep } from './steps/IncomeStep';
import { ExpenseStep } from './steps/ExpenseStep';
import { TransactionSummary } from './steps/TransactionSummary';
import { useAccounting } from '@/hooks/useAccounting';
import { toast } from '@/hooks/use-toast';

export function TransactionWizard() {
  const navigate = useNavigate();
  const { createBatchTransactions } = useAccounting();
  
  const [wizardState, setWizardState] = useState<TransactionWizardState>({
    currentStep: 'income',
    income: null,
    expenses: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIncomeComplete = (incomeData: WizardIncomeData) => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'expenses',
      income: incomeData
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleIncomeSkip = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'expenses'
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExpensesComplete = (expenseData: WizardExpenseData[]) => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'summary',
      expenses: expenseData
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExpensesSkip = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'summary'
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToIncome = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'income'
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToExpenses = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'expenses'
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    if (!wizardState.income && wizardState.expenses.length === 0) {
      toast({
        title: "No transactions to save",
        description: "Please add at least one income or expense entry",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const transactions = [];
      
      // Add income if exists
      if (wizardState.income) {
        const income = wizardState.income;
        const finalAmount = income.isVATInclusive 
          ? income.amount 
          : income.amount * (1 + income.vatPercent / 100);
          
        transactions.push({
          type: 'income' as const,
          date: income.date,
          amount: finalAmount,
          vat_percent: income.vatPercent,
          category: income.category,
          property_id: income.property_id,
          vendor: income.vendor || '',
          description: income.description || '',
          billable: false,
        });
      }
      
      // Add expenses
      wizardState.expenses.forEach(expense => {
        const finalAmount = expense.isVATInclusive 
          ? expense.amount 
          : expense.amount * (1 + expense.vatPercent / 100);
          
        transactions.push({
          type: 'expense' as const,
          date: expense.date,
          amount: finalAmount,
          vat_percent: expense.vatPercent,
          category: expense.category,
          property_id: expense.property_id,
          vendor: expense.vendor || '',
          description: expense.description || '',
          billable: expense.billable,
        });
      });

      const result = await createBatchTransactions(transactions);
      if (result) {
        navigate('/dashboard/accounting/transactions');
      }
    } catch (error) {
      console.error('Error saving transactions:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 'income':
        return (
          <IncomeStep
            initialData={wizardState.income}
            onComplete={handleIncomeComplete}
            onSkip={handleIncomeSkip}
          />
        );
      case 'expenses':
        return (
          <ExpenseStep
            initialExpenses={wizardState.expenses}
            onComplete={handleExpensesComplete}
            onSkip={handleExpensesSkip}
            onBack={handleBackToIncome}
          />
        );
      case 'summary':
        return (
          <TransactionSummary
            income={wizardState.income}
            expenses={wizardState.expenses}
            onBack={handleBackToExpenses}
            onSubmit={handleFinalSubmit}
            isSubmitting={isSubmitting}
          />
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (wizardState.currentStep) {
      case 'income':
        return 'Add Income';
      case 'expenses':
        return 'Add Expenses';
      case 'summary':
        return 'Review & Submit';
      default:
        return 'Add Transactions';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{getStepTitle()}</h2>
          <div className="flex items-center space-x-2 mt-2">
            {['income', 'expenses', 'summary'].map((step, index) => (
              <div key={step} className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  wizardState.currentStep === step 
                    ? 'bg-primary text-primary-foreground' 
                    : index < ['income', 'expenses', 'summary'].indexOf(wizardState.currentStep)
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-12 h-px ${
                    index < ['income', 'expenses', 'summary'].indexOf(wizardState.currentStep)
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard/accounting')}>
          Cancel
        </Button>
      </div>

      {renderStep()}
    </div>
  );
}
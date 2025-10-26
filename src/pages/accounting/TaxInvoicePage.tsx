import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { AccountingLayout } from '@/components/accounting/AccountingLayout';
import { useNavigate } from 'react-router-dom';
import { AccountingNav } from '@/components/accounting/AccountingNav';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  // Handle add income/expense from nav
  const handleAddIncome = () => {
    navigate('/dashboard/accounting/add-transaction?type=income');
  };

  const handleAddExpense = () => {
    navigate('/dashboard/accounting/add-transaction?type=expense');
  };

  // Create a custom layout props object to avoid TypeScript errors
  const layoutProps = {
    title: "SwiftBooks",
    currentTab: "/accounting",
    hideHeader: true
  };

  return (
    <EnhancedDashboardLayout {...layoutProps}>
      <AccountingLayout 
        title="SwiftBooks"
        subtitle="Generate Tax Invoice"
      >
        <div className="mb-6">
          <AccountingNav 
            onAddIncome={handleAddIncome}
            onAddExpense={handleAddExpense}
            className="max-w-md mx-auto"
          />
        </div>
        <TaxInvoiceGenerator />
      </AccountingLayout>
    </EnhancedDashboardLayout>
  );
}
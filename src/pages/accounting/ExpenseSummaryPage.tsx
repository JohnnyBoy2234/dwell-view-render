import React from 'react';
import { ExpenseSummaryReport } from '@/components/accounting/ExpenseSummaryReport';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function ExpenseSummaryPage() {
  return (
    <EnhancedDashboardLayout title="SARS Expense Summary">
      <ExpenseSummaryReport />
    </EnhancedDashboardLayout>
  );
}
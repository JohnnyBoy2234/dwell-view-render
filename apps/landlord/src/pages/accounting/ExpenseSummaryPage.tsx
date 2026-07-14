import React from 'react';
import { ExpenseSummaryReport } from '@mzanzihomes/features/accounting';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';

export default function ExpenseSummaryPage() {
  return (
    <EnhancedDashboardLayout title="SARS Expense Summary" subtitle="Monthly expense report for SARS">
      <ExpenseSummaryReport />
    </EnhancedDashboardLayout>
  );
}
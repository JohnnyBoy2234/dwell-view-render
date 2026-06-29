import React from 'react';
import { AddTransaction } from '@mzanzihomes/features/accounting';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function AddTransactionPage() {
  return (
    <EnhancedDashboardLayout title="Add Transaction">
      <AddTransaction />
    </EnhancedDashboardLayout>
  );
}
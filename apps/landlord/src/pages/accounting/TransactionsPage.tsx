import React from 'react';
import { TransactionsList } from '@mzanzihomes/features/accounting';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function TransactionsPage() {
  return (
    <EnhancedDashboardLayout title="Transactions">
      <TransactionsList />
    </EnhancedDashboardLayout>
  );
}
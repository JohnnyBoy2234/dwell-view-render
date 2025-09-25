import React from 'react';
import { TransactionsList } from '@/components/accounting/TransactionsList';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function TransactionsPage() {
  return (
    <EnhancedDashboardLayout title="Transactions">
      <TransactionsList />
    </EnhancedDashboardLayout>
  );
}
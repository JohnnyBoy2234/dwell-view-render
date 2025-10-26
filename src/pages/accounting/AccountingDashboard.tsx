import React from 'react';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function AccountingDashboard() {
  return (
    <EnhancedDashboardLayout title="Accounting">
      <AccountingOverview />
    </EnhancedDashboardLayout>
  );
}
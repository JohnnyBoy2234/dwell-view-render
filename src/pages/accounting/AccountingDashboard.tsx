import React from 'react';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function AccountingDashboard() {
  return (
    <EnhancedDashboardLayout 
      title="SwiftBooks" 
      currentTab="/enhancedlandlorddashboard/swiftbooks"
    >
      <AccountingOverview />
    </EnhancedDashboardLayout>
  );
}
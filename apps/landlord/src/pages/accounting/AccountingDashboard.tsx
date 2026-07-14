import React from 'react';
import { AccountingOverview } from '@mzanzihomes/features/accounting';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';

export default function AccountingDashboard() {
  return (
    <EnhancedDashboardLayout 
      title="SwiftBooks"
      subtitle="Track your property finances"
      currentTab="/enhancedlandlorddashboard/swiftbooks"
    >
      <AccountingOverview />
    </EnhancedDashboardLayout>
  );
}
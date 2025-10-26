import React from 'react';
import { AccountingOverview } from '@/components/accounting/AccountingOverview';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { AccountingLayout } from '@/components/accounting/AccountingLayout';
import { AccountingNav } from '@/components/accounting/AccountingNav';

export default function AccountingDashboard() {
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
        subtitle="Accounting"
      >
        <div className="mb-6">
          <AccountingNav className="max-w-md mx-auto" />
        </div>
        <AccountingOverview />
      </AccountingLayout>
    </EnhancedDashboardLayout>
  );
}
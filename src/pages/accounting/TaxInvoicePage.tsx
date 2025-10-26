import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function TaxInvoicePage() {
  return (
    <EnhancedDashboardLayout 
      title="SwiftBooks" 
      currentTab="/enhancedlandlorddashboard/tax-invoice"
      showBackButton={true}
      backPath="/enhancedlandlorddashboard/accounting"
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
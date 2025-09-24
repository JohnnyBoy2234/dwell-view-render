import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';

export default function TaxInvoicePage() {
  return (
    <EnhancedDashboardLayout title="Generate Tax Invoice">
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
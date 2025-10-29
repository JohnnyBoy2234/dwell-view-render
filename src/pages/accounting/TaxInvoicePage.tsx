import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    // Navigate to the accounting section instead of the property portfolio
    navigate('/dashboard/accounting');
  };

  return (
    <EnhancedDashboardLayout 
      title="SwiftBooks"
      currentTab="/enhancedlandlorddashboard/tax-invoice"
      onBackToProperties={handleBack}
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
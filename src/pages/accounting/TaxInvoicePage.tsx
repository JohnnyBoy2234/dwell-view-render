import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/enhancedlandlorddashboard');
  };

  return (
    <EnhancedDashboardLayout 
      title="Generate Tax Invoice"
      currentTab="/tax-invoice"
      onTabChange={handleBack}
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
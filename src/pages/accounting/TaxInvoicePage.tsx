import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/dashboard/accounting');
  };

  return (
    <EnhancedDashboardLayout 
      title="Tax Invoice" 
      currentTab="/enhancedlandlorddashboard/tax-invoice"
      onBackToProperties={handleBack}
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
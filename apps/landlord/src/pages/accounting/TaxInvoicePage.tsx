import React from 'react';
import { TaxInvoiceGenerator } from '@mzanzihomes/features/accounting';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate('/dashboard/accounting');
  };

  return (
    <EnhancedDashboardLayout 
      title="SwiftBooks"
      currentTab="/dashboard/accounting"
      onBackToProperties={handleBack}
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
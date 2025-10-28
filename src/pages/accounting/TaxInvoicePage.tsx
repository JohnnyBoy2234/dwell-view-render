import React, { useEffect, useState } from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [key, setKey] = useState(0);
  
  const handleBack = () => {
    navigate('/enhancedlandlorddashboard');
  };

  // Force a re-render when the location changes
  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [location.pathname]);

  return (
    <EnhancedDashboardLayout 
      title="Tax Invoice" 
      currentTab="/enhancedlandlorddashboard/tax-invoice"
      onBackToProperties={handleBack}
    >
      <TaxInvoiceGenerator key={key} refreshKey={key} />
    </EnhancedDashboardLayout>
  );
}
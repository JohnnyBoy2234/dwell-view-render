import React, { useEffect, useState } from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate, useLocation } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [key, setKey] = useState(0);
  
  // Get property ID from URL
  const searchParams = new URLSearchParams(location.search);
  const propertyId = searchParams.get('property');
  
  const handleBack = () => {
    if (propertyId) {
      navigate(`/enhancedlandlorddashboard/swiftbooks?property=${propertyId}`);
    } else {
      navigate('/enhancedlandlorddashboard');
    }
  };

  // Force a re-render when the location or property ID changes
  useEffect(() => {
    setKey(prevKey => prevKey + 1);
  }, [location.pathname, propertyId]);

  return (
    <EnhancedDashboardLayout 
      title="Tax Invoice" 
      currentTab="/enhancedlandlorddashboard/tax-invoice"
      onBackToProperties={handleBack}
    >
      <TaxInvoiceGenerator 
        key={key} 
        refreshKey={key} 
        propertyId={propertyId || undefined}
      />
    </EnhancedDashboardLayout>
  );
}
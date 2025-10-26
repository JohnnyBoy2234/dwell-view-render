import React from 'react';
import { TaxInvoiceGenerator } from '@/components/accounting/TaxInvoiceGenerator';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { useNavigate } from 'react-router-dom';

export default function TaxInvoicePage() {
  const navigate = useNavigate();
  
  // This will be used by the back button in the header
  const handleBack = () => {
    navigate('/enhancedlandlorddashboard');
  };

  return (
    <EnhancedDashboardLayout 
      title="Generate Tax Invoice"
      currentTab="/accounting" // This should match the tab you want to be active in the sidebar
      onTabChange={(tab) => {
        // Only navigate if trying to change to a different tab
        if (tab !== '/accounting') {
          navigate(tab);
        }
      }}
      // Force the back button to always go to management tools
      onBackToProperties={handleBack}
      // This will make the back button always visible
      selectedPropertyId="dummy"
    >
      <TaxInvoiceGenerator />
    </EnhancedDashboardLayout>
  );
}
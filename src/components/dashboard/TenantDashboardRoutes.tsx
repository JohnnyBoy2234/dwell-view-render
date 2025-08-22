import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import TenantLeaseDocuments from '@/pages/tenant/TenantLeaseDocuments';
import TenantMaintenance from '@/pages/tenant/TenantMaintenance';
import TenantPayments from '@/pages/tenant/TenantPayments';
import TenantSupport from '@/pages/tenant/TenantSupport';
import Messages from '@/pages/Messages';
import EnhancedTenantDashboard from '@/pages/EnhancedTenantDashboard';

export default function TenantDashboardRoutes() {
  return (
    <Routes>
      <Route path="/lease-documents" element={
        <EnhancedDashboardLayout title="Lease Documents">
          <TenantLeaseDocuments />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests">
          <TenantMaintenance />
        </EnhancedDashboardLayout>
      } />
      <Route path="/messages" element={
        <EnhancedDashboardLayout title="Messages">
          <Messages />
        </EnhancedDashboardLayout>
      } />
      <Route path="/payments" element={
        <EnhancedDashboardLayout title="Payments & Rent">
          <TenantPayments />
        </EnhancedDashboardLayout>
      } />
      <Route path="/support" element={
        <EnhancedDashboardLayout title="Support & Help">
          <TenantSupport />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';
import { LeaseDashboard as LeaseDashboardComponent } from '@mzanzihomes/features/lease';
import TenantPropertyViewings from '@/pages/tenant/TenantPropertyViewings';
import TenantInventory from '@/pages/tenant/TenantInventory';
import { ConditionRecordsPage } from '@mzanzihomes/features/condition-record';
import TenantProofOfPayment from '@/pages/tenant/TenantProofOfPayment';
import TenantLeaseDocuments from '@/pages/tenant/TenantLeaseDocuments';
import TenantMaintenance from '@/pages/tenant/TenantMaintenance';
import TenantMaintenanceResponses from '@/pages/tenant/TenantMaintenanceResponses';
import TenantPayments from '@/pages/tenant/TenantPayments';
import TenantSupport from '@/pages/tenant/TenantSupport';
import { Messages } from '@mzanzihomes/features/pages';
import EnhancedTenantDashboard from '@/pages/EnhancedTenantDashboard';
import { MaintenanceTicketDetails } from '@mzanzihomes/features/pages';
import { TenantApplicationsSection } from '@mzanzihomes/features/application';
import ProfilePage from '@mzanzihomes/ui/components/profile/ProfilePage';

export default function TenantDashboardRoutes() {
  return (
    <Routes>
      {/* Default dashboard route */}
      <Route index element={<EnhancedTenantDashboard />} />

      <Route path="contracts" element={
        <EnhancedDashboardLayout title="Contract Documents">
          <TenantLeaseDocuments />
        </EnhancedDashboardLayout>
      } />
      <Route path="leases" element={
        <EnhancedDashboardLayout title="Lease System">
          <LeaseDashboardComponent />
        </EnhancedDashboardLayout>
      } />
      <Route path="viewings" element={
        <EnhancedDashboardLayout title="Property Viewings">
          <TenantPropertyViewings />
        </EnhancedDashboardLayout>
      } />
      <Route path="inventory" element={
        <EnhancedDashboardLayout title="Property Inventory">
          <TenantInventory />
        </EnhancedDashboardLayout>
      } />
      <Route path="condition-records" element={
        <EnhancedDashboardLayout title="Condition Records">
          <ConditionRecordsPage />
        </EnhancedDashboardLayout>
      } />
      <Route path="proof-of-payment" element={
        <EnhancedDashboardLayout title="Proof of Payment">
          <TenantProofOfPayment />
        </EnhancedDashboardLayout>
      } />
      <Route path="applications" element={
        <EnhancedDashboardLayout title="Applications">
          <TenantApplicationsSection />
        </EnhancedDashboardLayout>
      } />
      <Route path="profile" element={
        <EnhancedDashboardLayout title="Profile Settings">
          <ProfilePage />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests">
          <TenantMaintenance />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance/responses" element={
        <EnhancedDashboardLayout title="Maintenance Responses">
          <TenantMaintenanceResponses />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance/:ticketId" element={
        <EnhancedDashboardLayout title="Maintenance Ticket">
          <MaintenanceTicketDetails />
        </EnhancedDashboardLayout>
      } />
      {/* Messages ships its own full-screen header — wrapping it in the
          dashboard layout would render the "Messages" title twice */}
      <Route path="messages" element={<Messages />} />
      <Route path="payments" element={
        <EnhancedDashboardLayout title="Payments & Rent">
          <TenantPayments />
        </EnhancedDashboardLayout>
      } />
      <Route path="support" element={
        <EnhancedDashboardLayout title="Support & Help">
          <TenantSupport />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}

import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';
import { LeaseDashboard as LeaseDashboardComponent } from '@mzanzihomes/features/lease';
import TenantPropertyViewings from '@/pages/tenant/TenantPropertyViewings';
import TenantInventory from '@/pages/tenant/TenantInventory';
import { ConditionRecordsPage, ConditionRecordDetailPage } from '@mzanzihomes/features/condition-record';
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
        <EnhancedDashboardLayout title="Contract Documents" subtitle="Your lease agreement and related documents">
          <TenantLeaseDocuments />
        </EnhancedDashboardLayout>
      } />
      <Route path="leases" element={
        <EnhancedDashboardLayout title="Lease System" subtitle="View and sign your lease">
          <LeaseDashboardComponent />
        </EnhancedDashboardLayout>
      } />
      <Route path="viewings" element={
        <EnhancedDashboardLayout title="Property Viewings" subtitle="Upcoming and past viewings">
          <TenantPropertyViewings />
        </EnhancedDashboardLayout>
      } />
      <Route path="inventory" element={
        <EnhancedDashboardLayout title="Property Inventory" subtitle="Recorded by your landlord for this property">
          <TenantInventory />
        </EnhancedDashboardLayout>
      } />
      <Route path="condition-records" element={
        <EnhancedDashboardLayout title="Condition Records" subtitle="Photo evidence at move-in and move-out">
          <ConditionRecordsPage />
        </EnhancedDashboardLayout>
      } />
      <Route path="condition-records/:recordId" element={
        <EnhancedDashboardLayout title="Condition Record" subtitle="Photos, notes and attestation">
          <ConditionRecordDetailPage />
        </EnhancedDashboardLayout>
      } />
      <Route path="proof-of-payment" element={
        <EnhancedDashboardLayout title="Proof of Payment" subtitle="Statements and transfer receipts">
          <TenantProofOfPayment />
        </EnhancedDashboardLayout>
      } />
      <Route path="applications" element={
        <EnhancedDashboardLayout title="Applications" subtitle="Invitations and application status">
          <TenantApplicationsSection />
        </EnhancedDashboardLayout>
      } />
      <Route path="profile" element={
        <EnhancedDashboardLayout title="Profile Settings" subtitle="Your details and preferences">
          <ProfilePage />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests" subtitle="Report issues and track progress">
          <TenantMaintenance />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance/responses" element={
        <EnhancedDashboardLayout title="Maintenance Responses" subtitle="Landlord replies to your requests">
          <TenantMaintenanceResponses />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance/:ticketId" element={
        <EnhancedDashboardLayout title="Maintenance Ticket" subtitle="Request details and updates">
          <MaintenanceTicketDetails />
        </EnhancedDashboardLayout>
      } />
      {/* Messages ships its own full-screen header — wrapping it in the
          dashboard layout would render the "Messages" title twice */}
      <Route path="messages" element={<Messages />} />
      <Route path="payments" element={
        <EnhancedDashboardLayout title="Payments & Rent" subtitle="Rent, bills and payment history">
          <TenantPayments />
        </EnhancedDashboardLayout>
      } />
      <Route path="support" element={
        <EnhancedDashboardLayout title="Support & Help" subtitle="FAQs and contact support">
          <TenantSupport />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}

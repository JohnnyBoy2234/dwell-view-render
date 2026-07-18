import { Routes, Route, Navigate } from 'react-router-dom';
import TileDetailLayout from '@/components/TileDetailLayout';
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
import { MaintenanceTicketDetails } from '@mzanzihomes/features/pages';
import { TenantApplicationsSection } from '@mzanzihomes/features/application';
import ProfilePage from '@mzanzihomes/ui/components/profile/ProfilePage';
import {
  Eye, Wrench, FileText, Camera, Receipt, ClipboardCheck, HelpCircle, Package, User,
} from 'lucide-react';

export default function TenantDashboardRoutes() {
  return (
    <Routes>
      {/* The standalone dashboard was retired — Home is the hub. */}
      <Route index element={<Navigate to="/" replace />} />

      <Route path="contracts" element={
        <TileDetailLayout icon={FileText} title="Contract Documents" subtitle="Your lease agreement and related documents">
          <TenantLeaseDocuments />
        </TileDetailLayout>
      } />
      <Route path="leases" element={
        <TileDetailLayout icon={FileText} title="Lease Contracts" subtitle="View and sign your lease">
          <LeaseDashboardComponent />
        </TileDetailLayout>
      } />
      <Route path="viewings" element={
        <TileDetailLayout icon={Eye} title="Viewings" subtitle="Upcoming and past viewings">
          <TenantPropertyViewings />
        </TileDetailLayout>
      } />
      <Route path="inventory" element={
        <TileDetailLayout icon={Package} title="Inventory" subtitle="Recorded by your landlord for this property">
          <TenantInventory />
        </TileDetailLayout>
      } />
      <Route path="condition-records" element={
        <TileDetailLayout icon={Camera} title="Inspection List" subtitle="Photos, notes and sign-off">
          <ConditionRecordsPage />
        </TileDetailLayout>
      } />
      <Route path="condition-records/:recordId" element={
        <TileDetailLayout icon={Camera} title="Inspection" subtitle="Photos, notes and sign-off">
          <ConditionRecordDetailPage />
        </TileDetailLayout>
      } />
      <Route path="proof-of-payment" element={
        <TileDetailLayout icon={Receipt} title="Payment Records" subtitle="Bills, invoices and receipts">
          <TenantProofOfPayment />
        </TileDetailLayout>
      } />
      <Route path="applications" element={
        <TileDetailLayout icon={ClipboardCheck} title="Applications" subtitle="Invitations, requests and application status">
          <TenantApplicationsSection />
        </TileDetailLayout>
      } />
      <Route path="profile" element={
        <TileDetailLayout icon={User} title="Profile Settings" subtitle="Your details and preferences">
          <ProfilePage />
        </TileDetailLayout>
      } />
      <Route path="maintenance" element={
        <TileDetailLayout icon={Wrench} title="Maintenance" subtitle="Report issues and track progress">
          <TenantMaintenance />
        </TileDetailLayout>
      } />
      <Route path="maintenance/responses" element={
        <TileDetailLayout icon={Wrench} title="Maintenance Responses" subtitle="Landlord replies to your requests">
          <TenantMaintenanceResponses />
        </TileDetailLayout>
      } />
      <Route path="maintenance/:ticketId" element={
        <TileDetailLayout icon={Wrench} title="Maintenance Ticket" subtitle="Request details and updates">
          <MaintenanceTicketDetails />
        </TileDetailLayout>
      } />
      {/* Messages ships its own full-screen header — wrapping it in the
          dashboard layout would render the "Messages" title twice */}
      <Route path="messages" element={<Messages />} />
      <Route path="payments" element={
        <TileDetailLayout icon={Receipt} title="Payments" subtitle="Rent, bills and payment history">
          <TenantPayments />
        </TileDetailLayout>
      } />
      <Route path="support" element={
        <TileDetailLayout icon={HelpCircle} title="Support & Help" subtitle="FAQs and contact support">
          <TenantSupport />
        </TileDetailLayout>
      } />
    </Routes>
  );
}

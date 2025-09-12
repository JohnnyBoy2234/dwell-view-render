import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import TenantPropertyViewings from '@/pages/tenant/TenantPropertyViewings';
import TenantInventory from '@/pages/tenant/TenantInventory';
import TenantProofOfPayment from '@/pages/tenant/TenantProofOfPayment';
import TenantLeaseDocuments from '@/pages/tenant/TenantLeaseDocuments';
import TenantMaintenance from '@/pages/tenant/TenantMaintenance';
import TenantMaintenanceResponses from '@/pages/tenant/TenantMaintenanceResponses';
import TenantPayments from '@/pages/tenant/TenantPayments';
import TenantSupport from '@/pages/tenant/TenantSupport';
import Messages from '@/pages/Messages';
import EnhancedTenantDashboard from '@/pages/EnhancedTenantDashboard';
import MaintenanceTicketDetails from '@/pages/MaintenanceTicketDetails';
import LeaseSigningPage from '@/pages/LeaseSigningPage';
import { TenantApplicationsSection } from '@/components/tenant/TenantApplicationsSection';
import { FileText, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProfilePage from '@/components/profile/ProfilePage';

export default function TenantDashboardRoutes() {
  return (
    <Routes>
      <Route path="/contracts" element={
        <EnhancedDashboardLayout title="Contract Documents">
          <TenantLeaseDocuments />
        </EnhancedDashboardLayout>
      } />
      <Route path="/viewings" element={
        <EnhancedDashboardLayout title="Property Viewings">
          <TenantPropertyViewings />
        </EnhancedDashboardLayout>
      } />
      <Route path="/inventory" element={
        <EnhancedDashboardLayout title="Property Inventory">
          <TenantInventory />
        </EnhancedDashboardLayout>
      } />
      <Route path="/proof-of-payment" element={
        <EnhancedDashboardLayout title="Proof of Payment">
          <TenantProofOfPayment />
        </EnhancedDashboardLayout>
      } />
      <Route path="/applications" element={
        <EnhancedDashboardLayout title="Applications">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-ocean-blue" />
              <h2 className="text-xl font-bold">Applications</h2>
            </div>
            <TenantApplicationsSection />
          </div>
        </EnhancedDashboardLayout>
      } />
      <Route path="/profile" element={
        <EnhancedDashboardLayout title="Profile Settings">
          <ProfilePage />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests">
          <TenantMaintenance />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance/responses" element={
        <EnhancedDashboardLayout title="Maintenance Responses">
          <TenantMaintenanceResponses />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance/:ticketId" element={
        <EnhancedDashboardLayout title="Maintenance Ticket">
          <MaintenanceTicketDetails />
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
      <Route path="/contracts/:leaseId/sign" element={
        <EnhancedDashboardLayout title="Sign Contract">
          <LeaseSigningPage />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
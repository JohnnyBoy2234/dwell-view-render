import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import { LeaseDashboard as LeaseDashboardComponent } from '@/components/lease/LeaseDashboard';
import TenantPropertyViewings from '@/pages/tenant/TenantPropertyViewings';
import TenantInventory from '@/pages/tenant/TenantInventory';
import TenantInspection from '@/pages/tenant/TenantInspection';
import TenantProofOfPayment from '@/pages/tenant/TenantProofOfPayment';
import TenantLeaseDocuments from '@/pages/tenant/TenantLeaseDocuments';
import TenantMaintenance from '@/pages/tenant/TenantMaintenance';
import TenantMaintenanceResponses from '@/pages/tenant/TenantMaintenanceResponses';
import TenantPayments from '@/pages/tenant/TenantPayments';
import TenantSupport from '@/pages/tenant/TenantSupport';
import Messages from '@/pages/Messages';
import EnhancedTenantDashboard from '@/pages/EnhancedTenantDashboard';
import MaintenanceTicketDetails from '@/pages/MaintenanceTicketDetails';
import { PlanGuard } from '@/components/subscription/PlanGuard';
import { TenantApplicationsSection } from '@/components/tenant/TenantApplicationsSection';
import { FileText, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ProfilePage from '@/components/profile/ProfilePage';

export default function TenantDashboardRoutes() {
  return (
    <Routes>
      {/* Default dashboard route */}
      <Route index element={<EnhancedTenantDashboard />} />
      <Route path="/" element={<EnhancedTenantDashboard />} />
      
      <Route path="/contracts" element={
        <PlanGuard requiredPlan="pro" featureName="Contract Documents">
          <EnhancedDashboardLayout title="Contract Documents">
            <TenantLeaseDocuments />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/leases" element={
        <PlanGuard requiredPlan="pro" featureName="Lease System">
          <EnhancedDashboardLayout title="Lease System">
            <LeaseDashboardComponent />
          </EnhancedDashboardLayout>
        </PlanGuard>
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
      <Route path="/inspection" element={
        <PlanGuard requiredPlan="pro" featureName="Property Inspections">
          <EnhancedDashboardLayout title="Property Inspection">
            <TenantInspection />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/proof-of-payment" element={
        <EnhancedDashboardLayout title="Proof of Payment">
          <TenantProofOfPayment />
        </EnhancedDashboardLayout>
      } />
      <Route path="/applications" element={
        <PlanGuard requiredPlan="pro" featureName="Rental Applications">
          <EnhancedDashboardLayout title="Applications">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-ocean-blue" />
                <h2 className="text-xl font-bold">Applications</h2>
              </div>
              <TenantApplicationsSection />
            </div>
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/profile" element={
        <EnhancedDashboardLayout title="Profile Settings">
          <ProfilePage />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance" element={
        <PlanGuard requiredPlan="premium" featureName="Maintenance Requests">
          <EnhancedDashboardLayout title="Maintenance Requests">
            <TenantMaintenance />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/maintenance/responses" element={
        <PlanGuard requiredPlan="premium" featureName="Maintenance Responses">
          <EnhancedDashboardLayout title="Maintenance Responses">
            <TenantMaintenanceResponses />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/maintenance/:ticketId" element={
        <PlanGuard requiredPlan="premium" featureName="Maintenance Tickets">
          <EnhancedDashboardLayout title="Maintenance Ticket">
            <MaintenanceTicketDetails />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/messages" element={
        <PlanGuard requiredPlan="pro" featureName="Messaging">
          <EnhancedDashboardLayout title="Messages">
            <Messages />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/payments" element={
        <PlanGuard requiredPlan="pro" featureName="Payment Processing">
          <EnhancedDashboardLayout title="Payments & Rent">
            <TenantPayments />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="/support" element={
        <EnhancedDashboardLayout title="Support & Help">
          <TenantSupport />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
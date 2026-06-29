import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import Messages from '@/pages/Messages';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import LandlordMaintenance from '@/pages/LandlordMaintenance';
import LandlordInspection from '@/pages/LandlordInspection';
import InventoryStart from '@/pages/InventoryStart';
import MaintenanceTicketDetails from '@/pages/MaintenanceTicketDetails';
import { MzanziHomesSupport } from '@mzanzihomes/features/support';
import { PlanGuard } from '@/components/PlanGuard';
import ProfilePage from '@/components/profile/ProfilePage';

// Placeholder components for missing landlord pages
function LandlordProperties() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Property management features coming soon.</p>
      </CardContent>
    </Card>
  );
}

function LandlordTenants() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant Management</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Tenant management features coming soon.</p>
      </CardContent>
    </Card>
  );
}

function LandlordApplications() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Applications</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Applications management coming soon.</p>
      </CardContent>
    </Card>
  );
}

function LandlordPayments() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Payments and billing features coming soon.</p>
      </CardContent>
    </Card>
  );
}

function LandlordReports() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SwiftBooks & Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>SwiftBooks and analytics coming soon.</p>
      </CardContent>
    </Card>
  );
}

export default function LandlordDashboardRoutes() {
  return (
    <Routes>
      <Route path="properties" element={
        <EnhancedDashboardLayout title="Properties Management">
          <LandlordProperties />
        </EnhancedDashboardLayout>
      } />
      <Route path="tenants" element={
        <PlanGuard requiredPlan="pro" featureName="Tenant Management">
          <EnhancedDashboardLayout title="Tenant Management">
            <LandlordTenants />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="messages" element={
        <PlanGuard requiredPlan="pro" featureName="In-Platform Messaging">
          <EnhancedDashboardLayout title="Messages">
            <Messages />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="applications" element={
        <PlanGuard requiredPlan="pro" featureName="Tenant Applications">
          <EnhancedDashboardLayout title="Applications">
            <LandlordApplications />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="payments" element={
        <PlanGuard requiredPlan="pro" featureName="Payment Management">
          <EnhancedDashboardLayout title="Payments">
            <LandlordPayments />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="reports" element={
        <PlanGuard requiredPlan="premium" featureName="SwiftBooks & Analytics">
          <EnhancedDashboardLayout title="SwiftBooks & Analytics">
            <LandlordReports />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="maintenance" element={
        <PlanGuard requiredPlan="premium" featureName="Maintenance Management">
          <EnhancedDashboardLayout title="Maintenance Requests">
            <LandlordMaintenance />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="inspection" element={
        <PlanGuard requiredPlan="pro" featureName="Property Inspections">
          <EnhancedDashboardLayout title="Property Inspection">
            <LandlordInspection />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="inspection/start" element={
        <PlanGuard requiredPlan="pro" featureName="Property Inspections">
          <EnhancedDashboardLayout title="Start Inspection">
            <InventoryStart />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="maintenance/:ticketId" element={
        <PlanGuard requiredPlan="premium" featureName="Maintenance Management">
          <EnhancedDashboardLayout title="Maintenance Ticket">
            <MaintenanceTicketDetails />
          </EnhancedDashboardLayout>
        </PlanGuard>
      } />
      <Route path="profile" element={
        <EnhancedDashboardLayout title="Profile Settings">
          <ProfilePage />
        </EnhancedDashboardLayout>
      } />
      <Route path="support" element={
        <EnhancedDashboardLayout title="Support & Help">
          <MzanziHomesSupport />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
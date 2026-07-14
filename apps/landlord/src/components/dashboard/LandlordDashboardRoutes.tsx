import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';
import { Messages } from '@mzanzihomes/features/pages';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import LandlordMaintenance from '@/pages/LandlordMaintenance';
import { ConditionRecordsPage, ConditionRecordDetailPage } from '@mzanzihomes/features/condition-record';
import { MaintenanceTicketDetails } from '@mzanzihomes/features/pages';
import { MzanziHomesSupport } from '@mzanzihomes/features/support';
import { PlanGuard } from '@mzanzihomes/ui/components/PlanGuard';
import ProfilePage from '@mzanzihomes/ui/components/profile/ProfilePage';
import { LandlordBillingPanel } from '@mzanzihomes/features/billing';

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
  return <LandlordBillingPanel />;
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
      {/* Messages ships its own full-screen header — wrapping it in the
          dashboard layout would render the "Messages" title twice */}
      <Route path="messages" element={
        <PlanGuard requiredPlan="pro" featureName="In-Platform Messaging">
          <Messages />
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
      {/* No PlanGuard: the record needs both parties regardless of plan (see plan Task 7). */}
      <Route path="condition-records" element={
        <EnhancedDashboardLayout title="Condition Records">
          <ConditionRecordsPage />
        </EnhancedDashboardLayout>
      } />
      <Route path="condition-records/:recordId" element={
        <EnhancedDashboardLayout title="Condition Record">
          <ConditionRecordDetailPage />
        </EnhancedDashboardLayout>
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

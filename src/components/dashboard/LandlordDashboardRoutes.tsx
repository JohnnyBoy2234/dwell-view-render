import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import Messages from '@/pages/Messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LandlordMaintenance from '@/pages/LandlordMaintenance';
import MaintenanceTicketDetails from '@/pages/MaintenanceTicketDetails';

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
        <CardTitle>Reports & Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Reports and analytics coming soon.</p>
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
        <EnhancedDashboardLayout title="Tenant Management">
          <LandlordTenants />
        </EnhancedDashboardLayout>
      } />
      <Route path="messages" element={
        <EnhancedDashboardLayout title="Messages">
          <Messages />
        </EnhancedDashboardLayout>
      } />
      <Route path="applications" element={
        <EnhancedDashboardLayout title="Applications">
          <LandlordApplications />
        </EnhancedDashboardLayout>
      } />
      <Route path="payments" element={
        <EnhancedDashboardLayout title="Payments">
          <LandlordPayments />
        </EnhancedDashboardLayout>
      } />
      <Route path="reports" element={
        <EnhancedDashboardLayout title="Reports & Analytics">
          <LandlordReports />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests">
          <LandlordMaintenance />
        </EnhancedDashboardLayout>
      } />
      <Route path="maintenance/:ticketId" element={
        <EnhancedDashboardLayout title="Maintenance Ticket">
          <MaintenanceTicketDetails />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
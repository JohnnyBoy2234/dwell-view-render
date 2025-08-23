import { Routes, Route } from 'react-router-dom';
import { EnhancedDashboardLayout } from './EnhancedDashboardLayout';
import Messages from '@/pages/Messages';
import Properties from '@/pages/Properties';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LandlordMaintenance from '@/pages/LandlordMaintenance';

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

export default function LandlordDashboardRoutes() {
  return (
    <Routes>
      <Route path="/properties" element={
        <EnhancedDashboardLayout title="Properties Management">
          <LandlordProperties />
        </EnhancedDashboardLayout>
      } />
      <Route path="/tenants" element={
        <EnhancedDashboardLayout title="Tenant Management">
          <LandlordTenants />
        </EnhancedDashboardLayout>
      } />
      <Route path="/messages" element={
        <EnhancedDashboardLayout title="Messages">
          <Messages />
        </EnhancedDashboardLayout>
      } />
      <Route path="/maintenance" element={
        <EnhancedDashboardLayout title="Maintenance Requests">
          <LandlordMaintenance />
        </EnhancedDashboardLayout>
      } />
    </Routes>
  );
}
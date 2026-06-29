import { Routes, Route } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminManagement from "@/pages/admin/AdminManagement";
import AdminProperties from "@/pages/admin/AdminProperties";
import PropertyReports from "@/pages/admin/PropertyReports";
import DocumentReview from "@/pages/admin/DocumentReview";
import UsersManagement from "@/pages/admin/UsersManagement";
import KycManagement from "@/pages/admin/KycManagement";
import { SupportMessagesAdmin } from "@/components/admin/SupportMessagesAdmin";

// Mounted at /admin/* in App.tsx, so paths here are relative to /admin.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
      <Route path="management" element={<AdminLayout><AdminManagement /></AdminLayout>} />
      <Route path="users" element={<AdminLayout><UsersManagement /></AdminLayout>} />
      <Route path="admin-users" element={<AdminLayout><AdminManagement /></AdminLayout>} />
      <Route path="properties" element={<AdminLayout><AdminProperties /></AdminLayout>} />
      <Route path="documents" element={<AdminLayout><DocumentReview /></AdminLayout>} />
      <Route path="kyc" element={<AdminLayout><KycManagement /></AdminLayout>} />
      <Route path="reports" element={<AdminLayout><PropertyReports /></AdminLayout>} />
      <Route path="support" element={<AdminLayout><SupportMessagesAdmin /></AdminLayout>} />
    </Routes>
  );
}

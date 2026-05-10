import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminUsersTab } from './AdminUsersTab';

export default function AdminManagement() {
  return (
    <AdminLayout>
      <AdminUsersTab />
    </AdminLayout>
  );
}
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminGuard } from '@/components/AdminGuard';
import { AdminAuthProvider } from '@/hooks/useAdminAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminGuard>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col">
              <header className="h-12 flex items-center border-b bg-background/80 backdrop-blur-sm">
                <SidebarTrigger className="ml-2" />
                <div className="flex-1 px-4">
                  <h1 className="text-lg font-semibold">Admin Panel</h1>
                </div>
              </header>
              
              <main className="flex-1 p-6">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </AdminGuard>
    </AdminAuthProvider>
  );
}
import { Shield } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@mzanzihomes/ui/components/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { AdminGuard } from '@mzanzihomes/ui/components/AdminGuard';
import { AdminAuthProvider } from '@mzanzihomes/supabase/hooks/useAdminAuth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminGuard>
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-slate-50">
            <AdminSidebar />

            <div className="flex flex-1 flex-col">
              <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/85 px-3 backdrop-blur-md">
                <SidebarTrigger className="text-slate-500" />
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'hsl(214,100%,59%)' }}>
                    <Shield className="h-4 w-4 text-white" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[14px] font-bold text-slate-900">MzanziHomes Admin</p>
                  </div>
                </div>
              </header>

              <main className="flex-1 p-4 sm:p-6 lg:p-8">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </AdminGuard>
    </AdminAuthProvider>
  );
}
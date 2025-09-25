import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bell, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, actions }: DashboardLayoutProps) {
  const { signOut } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center border-b bg-background/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1 ml-4 lg:ml-0">
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Notifications - using unified bell component */}
              <NotificationBell className="hidden sm:block" />
              
              {actions}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
                className="hidden sm:flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
              
              {/* Mobile sign out - icon only */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={signOut}
                className="sm:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
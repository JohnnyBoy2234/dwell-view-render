import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TenantSidebar } from './TenantSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bell, LogOut } from 'lucide-react';
import { useTenantNotifications } from '@/hooks/useTenantNotifications';
import { Badge } from '@/components/ui/badge';

interface TenantLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function TenantLayout({ children, title, actions }: TenantLayoutProps) {
  const { signOut } = useAuth();
  const { unreadCount } = useTenantNotifications();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-earth-light/20 to-success-green/5">
        <TenantSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 px-4 lg:px-6">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1 ml-4 lg:ml-0">
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Notifications - Simple indicator on mobile */}
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
              
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
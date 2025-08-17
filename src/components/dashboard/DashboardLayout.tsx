import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Bell, LogOut } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
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
  const { notifications, unreadCount, markAsRead } = useNotifications();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 flex items-center border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40 px-4 lg:px-6">
            <SidebarTrigger className="lg:hidden" />
            <div className="flex-1 ml-4 lg:ml-0">
              <h1 className="text-xl lg:text-2xl font-bold">{title}</h1>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Notifications - Hidden on mobile to save space */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hidden sm:flex">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-0">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    <div className="max-h-96 overflow-auto">
                      {notifications.slice(0, 8).map((n) => (
                        <DropdownMenuItem key={n.id} asChild>
                          <Link
                            to={n.link_url || '#'}
                            className={`block w-full text-left px-3 py-2 ${n.is_read ? 'opacity-70' : ''}`}
                            onClick={() => markAsRead(n.id)}
                          >
                            <div className="text-sm leading-snug">{n.message}</div>
                            <div className="text-[11px] text-muted-foreground mt-1">
                              {new Date(n.created_at).toLocaleString()}
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
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
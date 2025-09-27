import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { EnhancedSidebar } from './EnhancedSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Component, ReactNode } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          We encountered an error while loading this section. Please try again.
        </p>
        <Button onClick={resetErrorBoundary} variant="outline">
          Try Again
        </Button>
      </div>
    </div>
  );
}

export function EnhancedDashboardLayout({ children, title, actions, currentTab, onTabChange }: EnhancedDashboardLayoutProps) {
  const { signOut, isLandlord } = useAuth();
  const userRole = isLandlord ? 'landlord' : 'tenant';

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-ocean-blue/[0.06] via-background to-success-green/[0.06]">
        <EnhancedSidebar currentTab={currentTab} onTabChange={onTabChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced Header */}
          <header className="h-16 flex items-center border-b sticky top-0 z-40 px-3 sm:px-4 lg:px-6 bg-gradient-to-r from-ocean-blue/[0.15] via-background/95 to-success-green/[0.15] backdrop-blur-md">
            <SidebarTrigger className="md:hidden mr-3">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">{title}</h1>
                <div className="hidden sm:block">
                  <Badge variant="secondary" className="text-xs">
                    {userRole === 'landlord' ? 'Landlord' : 'Tenant'}
                  </Badge>
                </div>
                <div className="hidden sm:block">
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {BUILD_TAG}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
              {/* Notifications */}
              <NotificationBell className="hidden sm:block" />
              
              {/* Custom Actions */}
              {actions}
              
              {/* Sign Out Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          
          {/* Main Content with Error Boundary */}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
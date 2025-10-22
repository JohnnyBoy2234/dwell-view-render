import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { EnhancedSidebar } from './EnhancedSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Component, ReactNode } from 'react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { LANDLORD_PAGE_CONFIG } from '@/constants/dashboardPageConfig';

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  selectedPropertyId?: string | null;
  onBackToProperties?: () => void;
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

export function EnhancedDashboardLayout({ children, title, actions, currentTab, onTabChange, selectedPropertyId, onBackToProperties }: EnhancedDashboardLayoutProps) {
  const { signOut, isLandlord } = useAuth();
  const userRole = isLandlord ? 'landlord' : 'tenant';
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Get page configuration based on current tab
  const pageConfig = LANDLORD_PAGE_CONFIG[currentTab || '/enhancedlandlorddashboard'] || LANDLORD_PAGE_CONFIG['/enhancedlandlorddashboard'];
  const PageIcon = pageConfig.icon;

  // Determine when to show back button
  const shouldShowBackButton = 
    (currentTab === '/enhancedlandlorddashboard' && selectedPropertyId) || // On Management Tools with property selected
    (currentTab !== '/enhancedlandlorddashboard'); // On any sub-page

  // Handle back button click
  const handleBackClick = () => {
    if (currentTab === '/enhancedlandlorddashboard' && selectedPropertyId) {
      // On Management Tools page -> go back to Property Selection
      onBackToProperties?.();
    } else if (currentTab !== '/enhancedlandlorddashboard') {
      // On sub-page -> go back to Management Tools
      const params = selectedPropertyId ? `?property=${selectedPropertyId}` : '';
      // Update parent state immediately for snappy UI, then navigate
      onTabChange?.('/enhancedlandlorddashboard');
      navigate(`/enhancedlandlorddashboard${params}`);
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-ocean-blue/[0.06] via-background to-success-green/[0.06]">
        <EnhancedSidebar currentTab={currentTab} onTabChange={onTabChange} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Enhanced Header */}
          <header className="h-16 flex items-center border-b sticky top-0 z-40 px-3 sm:px-4 lg:px-6 bg-gradient-to-r from-ocean-blue/[0.25] via-background/95 to-success-green/[0.25] backdrop-blur-md">
          {/* Back button if needed, otherwise Sidebar trigger */}
          {shouldShowBackButton ? (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBackClick}
              className="mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <SidebarTrigger className="md:hidden mr-3">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {/* Icon with gradient background */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-ocean-blue to-success-green">
                  <PageIcon className="h-5 w-5 text-white" />
                </div>
                
                {/* Dynamic title */}
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">{pageConfig.title}</h1>
                
                <div className="hidden sm:block">
                  <Badge variant="secondary" className="text-xs">
                    {userRole === 'landlord' ? 'Landlord' : 'Tenant'}
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
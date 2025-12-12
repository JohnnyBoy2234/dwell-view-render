import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { getPageConfig } from '@/constants/dashboardPageConfig';

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

  const basePath = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
  const activePath = currentTab || basePath;

  const pageConfig = getPageConfig(activePath, isLandlord);
  const PageIcon = pageConfig.icon;

  const shouldShowBackButton = pageConfig.showBackButton || false;

  const handleBackClick = () => {
    if (isLandlord) {
      if (title === 'Generate Invoice' || activePath.includes('tax-invoice')) {
      navigate('/enhancedlandlorddashboard');
        return;
      }

      if (activePath === '/enhancedlandlorddashboard' && selectedPropertyId) {
      onBackToProperties?.();
        return;
      }

      if (activePath !== '/enhancedlandlorddashboard') {
      const params = selectedPropertyId ? `?property=${selectedPropertyId}` : '';
      onTabChange?.('/enhancedlandlorddashboard');
      navigate(`/enhancedlandlorddashboard${params}`);
        return;
      }

      navigate('/enhancedlandlorddashboard');
    } else {
      const backPath = pageConfig.backPath || basePath;
      onTabChange?.(backPath);
      navigate(backPath);
    }
  };

  const isPropertySelection = !selectedPropertyId;
  const isLandlordDashboardRoute = activePath.startsWith('/enhancedlandlorddashboard');

  return (
    <div className={`flex flex-col min-h-screen w-full ${
        isLandlordDashboardRoute
          ? 'bg-transparent'
          : 'bg-ocean-blue/[0.06]'
    }`}>
        {/* Enhanced Header */}
        <header className={`h-16 flex items-center border-b sticky top-0 z-40 px-3 sm:px-4 lg:px-6 ${
          isLandlord 
            ? 'bg-ocean-blue/[0.25]' 
            : 'bg-blue-500/[0.15]'
        } backdrop-blur-md`}>
          {/* Back button if needed, otherwise Sidebar trigger */}
          {shouldShowBackButton && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBackClick}
              className="mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {/* Icon with gradient background */}
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ocean-blue">
                  <PageIcon className="h-5 w-5 text-white" />
                </div>
                
                {/* Dynamic title */}
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">{title || pageConfig.title}</h1>
                
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
      <main className={`flex-1 w-full ${isLandlordDashboardRoute ? 'p-0' : 'p-3 sm:p-4 lg:p-6'} overflow-x-hidden`}>
            {children}
          </main>
      </div>
  );
}
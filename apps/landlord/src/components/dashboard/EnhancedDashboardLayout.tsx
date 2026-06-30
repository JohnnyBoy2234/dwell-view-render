import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useLocation } from 'react-router-dom';
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

  const { pathname } = useLocation();
  const basePath = isLandlord ? '/enhancedlandlorddashboard' : '/enhancedtenantdashboard';
  const activePath = currentTab || pathname;

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
    <div
      className="flex flex-col min-h-screen w-full overflow-hidden"
      style={{ minHeight: '100dvh', background: 'hsl(214, 60%, 97%)' }}
    >
      {/* Header — dark glass, matching home page navbar */}
      <header
        className="h-16 flex items-center border-b border-white/10 sticky top-0 z-40 px-3 sm:px-4 lg:px-6 backdrop-blur-md shrink-0"
        style={{
          background: 'rgba(10,10,20,0.78)',
          boxShadow: '0 2px 24px rgba(37,99,235,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
          willChange: 'transform',
        }}
      >
        {shouldShowBackButton && (
          <button
            onClick={handleBackClick}
            className="mr-3 w-8 h-8 rounded-full bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors text-gray-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: 'hsl(214, 100%, 59%)' }}>
              <PageIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white truncate">{title || pageConfig.title}</h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/15 text-gray-300 bg-white/5">
              {userRole === 'landlord' ? 'Landlord' : 'Tenant'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
          <NotificationBell className="flex text-gray-300" />
          {actions}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/15 bg-white/5 text-gray-300 hover:border-white/35 hover:text-white transition-all duration-200"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`flex-1 w-full overflow-x-hidden ${isLandlordDashboardRoute ? 'p-0' : 'p-3 sm:p-5 lg:p-7'}`}
        style={{ contain: 'layout style paint' }}
      >
        {children}
      </main>
    </div>
  );
}
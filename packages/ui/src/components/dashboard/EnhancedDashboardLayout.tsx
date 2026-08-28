import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { Button } from '@mzanzihomes/ui/components/button';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { useNavigate, useLocation } from 'react-router-dom';
import { NotificationBell } from '@mzanzihomes/ui/components/notifications/NotificationBell';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import { getPageConfig } from '@mzanzihomes/common/constants/dashboardPageConfig';

interface EnhancedDashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  selectedPropertyId?: string | null;
  onBackToProperties?: () => void;
  // Hide the dark app-bar and remove main padding so a page can own the full
  // canvas (e.g. the tenant dashboard's blue header that curves into a sheet).
  hideHeader?: boolean;
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

export function EnhancedDashboardLayout({ children, title, subtitle, actions, currentTab, onTabChange, selectedPropertyId, onBackToProperties, hideHeader }: EnhancedDashboardLayoutProps) {
  const { isLandlord } = useAuth();
  const navigate = useNavigate();

  const { pathname } = useLocation();
  const basePath = isLandlord ? '/landlord/dashboard' : '/tenant-dashboard';
  const activePath = currentTab || pathname;

  const pageConfig = getPageConfig(activePath, isLandlord);
  const PageIcon = pageConfig.icon;

  // Header icon colour matches the module's dashboard tile colour.
  const headerAccent = (() => {
    const p = activePath;
    if (p.includes('/applications')) return '#f97316';       // orange
    if (p.includes('/maintenance')) return '#f5a623';         // gold
    if (p.includes('/payments')) return '#14b8a6';            // teal
    if (p.includes('/leases')) return '#22417a';              // navy
    if (p.includes('/inventory')) return '#0f766e';           // dark teal
    if (p.includes('/condition-records')) return '#ef4444';   // red (inspection)
    if (p.includes('/support')) return '#f5a623';             // gold
    if (p.includes('/swiftbooks') || p.includes('/tax-invoice')) return '#7c3aed'; // violet
    return '#2563EB';                                         // default blue
  })();

  const shouldShowBackButton = pageConfig.showBackButton || false;

  const handleBackClick = () => {
    if (isLandlord) {
      if (title === 'Generate Invoice' || activePath.includes('tax-invoice')) {
      navigate('/landlord/dashboard');
        return;
      }

      if (activePath === '/landlord/dashboard' && selectedPropertyId) {
      onBackToProperties?.();
        return;
      }

      if (activePath !== '/landlord/dashboard') {
      const params = selectedPropertyId ? `?property=${selectedPropertyId}` : '';
      onTabChange?.('/landlord/dashboard');
      navigate(`/landlord/dashboard${params}`);
        return;
      }

      navigate('/landlord/dashboard');
    } else {
      // Tenants: behave like a browser back button — return to wherever they
      // came from, falling back to the configured hub on a fresh session.
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
      const backPath = pageConfig.backPath || basePath;
      onTabChange?.(backPath);
      navigate(backPath);
    }
  };

  const isPropertySelection = !selectedPropertyId;
  const isLandlordDashboardRoute = activePath.startsWith('/landlord/dashboard');

  return (
    <div
      className="flex flex-col min-h-screen w-full overflow-x-clip"
      style={{ minHeight: '100dvh', background: hideHeader ? 'hsl(214, 60%, 97%)' : '#0a1f45' }}
    >
      {/* Header — navy gradient curving into a light sheet, matching the tenant tile pages */}
      {!hideHeader && (
        <>
          <div
            className="px-4 pb-12 pt-3.5"
            style={{ background: 'linear-gradient(180deg, #12315f 0%, #0a1f45 100%)' }}
          >
            <div className="flex items-center gap-3">
              {shouldShowBackButton && (
                <button
                  onClick={handleBackClick}
                  aria-label="Back"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition-colors hover:bg-white/15 active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: headerAccent }}>
                <PageIcon className="h-[18px] w-[18px] text-white" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[17px] font-bold leading-tight text-white">{title || pageConfig.title}</h1>
                {subtitle && (
                  <p className="truncate text-[12px] leading-snug" style={{ color: 'rgba(191,214,255,0.85)' }}>{subtitle}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {actions}
                <UserMenu />
              </div>
            </div>
          </div>
          {/* Light sheet lip that curves up over the navy header */}
          <div className="-mt-7 h-7 rounded-t-[28px]" style={{ background: '#f6f8fc' }} />
        </>
      )}

      {/* Main Content. The status-bar/home-indicator insets are applied globally
          on #root, so pages don't add their own here. */}
      <main
        className={`flex-1 w-full overflow-x-hidden ${isLandlordDashboardRoute || hideHeader ? 'p-0' : 'p-3 sm:p-5 lg:p-7'}`}
        style={{ background: hideHeader ? undefined : '#f6f8fc', contain: 'layout style' }}
      >
        {children}
      </main>
    </div>
  );
}
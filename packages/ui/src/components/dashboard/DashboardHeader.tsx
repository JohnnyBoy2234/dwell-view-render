import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { DASHBOARD_LABELS, DASHBOARD_ARIA_LABELS } from '@mzanzihomes/common/constants/dashboardConstants';

interface DashboardHeaderProps {
  title: string;
  actions?: React.ReactNode;
  showMobileSidebarToggle?: boolean;
}

/**
 * Dashboard header component with navigation and actions
 */
export function DashboardHeader({ 
  title, 
  actions, 
  showMobileSidebarToggle = true 
}: DashboardHeaderProps) {
  const { signOut } = useAuth();

  return (
    <header 
      className="h-16 flex items-center justify-between border-b bg-background/95 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6"
      role="banner"
      aria-label={DASHBOARD_ARIA_LABELS.HEADER}
    >
      <div className="flex-1 flex items-center">
        {showMobileSidebarToggle && <SidebarTrigger className="lg:hidden" />}
        <div className="hidden lg:block w-10"></div>
      </div>
      
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl lg:text-2xl font-bold text-center">{title}</h1>
      </div>
      
      <div className="flex-1 flex justify-end">
        <div className="flex items-center gap-2 lg:gap-4">
          <NotificationBell 
            className="hidden sm:block" 
            aria-label={DASHBOARD_ARIA_LABELS.NOTIFICATIONS}
          />
          
          {actions}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={signOut}
            className="hidden sm:flex"
            aria-label={DASHBOARD_ARIA_LABELS.SIGN_OUT_BUTTON}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">{DASHBOARD_LABELS.SIGN_OUT}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={signOut}
            className="sm:hidden"
            aria-label={DASHBOARD_ARIA_LABELS.SIGN_OUT_BUTTON}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
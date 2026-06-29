import { DashboardHeader } from './DashboardHeader';
import { DASHBOARD_LAYOUT, DASHBOARD_ARIA_LABELS } from '@mzanzihomes/common/constants/dashboardConstants';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

/**
 * Main dashboard layout component
 * Provides consistent layout structure with header and main content area
 */
export function DashboardLayout({ children, title, actions }: DashboardLayoutProps) {
  return (
    <div className={`min-h-screen w-full ${DASHBOARD_LAYOUT.BACKGROUND_GRADIENT}`}>
      <div className="flex flex-col">
        <DashboardHeader title={title} actions={actions} showMobileSidebarToggle={false} />
        
        <main 
          className="flex-1 p-4 lg:p-6 overflow-x-hidden"
          role="main"
          aria-label={DASHBOARD_ARIA_LABELS.MAIN_CONTENT}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
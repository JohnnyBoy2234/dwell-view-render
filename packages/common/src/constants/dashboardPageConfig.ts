import { 
  Home, 
  Building, 
  Inbox, 
  FileText, 
  Users, 
  Wrench,
  BarChart3,
  Camera,
  LucideIcon,
  MessageCircle,
  Bell,
  Settings,
  Eye,
  Receipt,
  Clipboard,
  HelpCircle
} from 'lucide-react';

export interface PageConfig {
  title: string;
  icon: LucideIcon;
  showSidebar: boolean;
  showBackButton: boolean;
  backPath?: string;
}

export const TENANT_PAGE_CONFIG: Record<string, PageConfig> = {
  '/enhancedtenantdashboard': {
    title: 'Dashboard',
    icon: Home,
    showSidebar: true,
    showBackButton: false,
  },
  '/enhancedtenantdashboard/messages': {
    title: 'Messages',
    icon: MessageCircle,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/notifications': {
    title: 'Notifications',
    icon: Bell,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/leases': {
    title: 'My Lease',
    icon: FileText,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/payments': {
    title: 'Payments',
    icon: Receipt,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/maintenance': {
    title: 'Maintenance',
    icon: Wrench,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/settings': {
    title: 'Settings',
    icon: Settings,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/viewings': {
    title: 'Viewings',
    icon: Eye,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/inventory': {
    title: 'Inventory',
    icon: Clipboard,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
  '/enhancedtenantdashboard/help': {
    title: 'Help & Support',
    icon: HelpCircle,
    showSidebar: true,
    showBackButton: true,
    backPath: '/enhancedtenantdashboard',
  },
};

// Routes served by TenantDashboardRoutes, mounted at both /tenant/* and
// /tenant-dashboard/* (true aliases of the same router). backPath points at
// /tenant-dashboard -- the live tenant hub -- not the legacy
// /enhancedtenantdashboard shell, which is a disconnected, separate page.
const TENANT_DASHBOARD_ROUTE_CONFIG: Record<string, PageConfig> = {
  '/maintenance': {
    title: 'Maintenance',
    icon: Wrench,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/maintenance/responses': {
    title: 'Maintenance Responses',
    icon: Wrench,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard/maintenance',
  },
  '/payments': {
    title: 'Payments & Rent',
    icon: Receipt,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/leases': {
    title: 'Lease System',
    icon: FileText,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/contracts': {
    title: 'Contract Documents',
    icon: FileText,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/viewings': {
    title: 'Property Viewings',
    icon: Eye,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/inventory': {
    title: 'Property Inventory',
    icon: Clipboard,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/condition-records': {
    title: 'Inspection List',
    icon: Camera,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/proof-of-payment': {
    title: 'Payment Records',
    icon: Receipt,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/applications': {
    title: 'Applications',
    icon: Inbox,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/profile': {
    title: 'Profile Settings',
    icon: Settings,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/messages': {
    title: 'Messages',
    icon: MessageCircle,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
  '/support': {
    title: 'Support & Help',
    icon: HelpCircle,
    showSidebar: false,
    showBackButton: true,
    backPath: '/tenant-dashboard',
  },
};

for (const [suffix, config] of Object.entries(TENANT_DASHBOARD_ROUTE_CONFIG)) {
  TENANT_PAGE_CONFIG[`/tenant${suffix}`] = config;
  TENANT_PAGE_CONFIG[`/tenant-dashboard${suffix}`] = config;
}

export const LANDLORD_PAGE_CONFIG: Record<string, PageConfig> = {
  '/enhancedlandlorddashboard': {
    title: 'Management Tools',
    icon: Home,
    showSidebar: true,
    showBackButton: false,
  },
  '/enhancedlandlorddashboard/properties': {
    title: 'Property Portfolio',
    icon: Building,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/applications': {
    title: 'Applications',
    icon: Inbox,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/leases': {
    title: 'Lease Management',
    icon: FileText,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/tenants': {
    title: 'Tenants',
    icon: Users,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/payments': {
    title: 'Payments',
    icon: BarChart3,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/maintenance': {
    title: 'Maintenance',
    icon: Wrench,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/inventory': {
    title: 'Inventory',
    icon: Camera,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/condition-records': {
    title: 'Inspection List',
    icon: Camera,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/swiftbooks': {
    title: 'SwiftBooks',
    icon: BarChart3,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/tax-invoice': {
    title: 'SwiftBooks',
    icon: BarChart3,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
  '/enhancedlandlorddashboard/profile': {
    title: 'Profile Settings',
    icon: Settings,
    showSidebar: false,
    showBackButton: true,
    backPath: '/enhancedlandlorddashboard',
  },
};

export const getPageConfig = (path: string, isLandlord: boolean): PageConfig => {
  const map = isLandlord ? LANDLORD_PAGE_CONFIG : TENANT_PAGE_CONFIG;
  if (map[path]) return map[path];

  // Handle dynamic segments (e.g. /tenant/maintenance/:ticketId, /tenant-dashboard/maintenance/:ticketId)
  if (!isLandlord && (path.startsWith('/tenant/maintenance/') || path.startsWith('/tenant-dashboard/maintenance/'))) {
    return { title: 'Maintenance Ticket', icon: Wrench, showSidebar: false, showBackButton: true, backPath: '/tenant-dashboard/maintenance' };
  }

  return { title: 'Dashboard', icon: Home, showSidebar: true, showBackButton: true, backPath: isLandlord ? '/enhancedlandlorddashboard' : '/tenant-dashboard' };
};

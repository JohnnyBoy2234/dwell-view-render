import { 
  Home, 
  Building, 
  Inbox, 
  FileText, 
  Users, 
  Wrench, 
  ClipboardList, 
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
  '/enhancedlandlorddashboard/inspection': {
    title: 'Inspection',
    icon: ClipboardList,
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
};

export const getPageConfig = (path: string, isLandlord: boolean): PageConfig => {
  const config = isLandlord ? LANDLORD_PAGE_CONFIG[path] : TENANT_PAGE_CONFIG[path];
  return config || {
    title: 'Page Not Found',
    icon: Home,
    showSidebar: true,
    showBackButton: true,
  };
};

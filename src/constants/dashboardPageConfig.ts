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
  LucideIcon 
} from 'lucide-react';

export interface PageConfig {
  title: string;
  icon: LucideIcon;
  showSidebar: boolean;
  showBackButton: boolean;
  backPath?: string;
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
    title: 'Lease System',
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
};

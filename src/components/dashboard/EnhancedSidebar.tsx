import { Home, MessageSquare, BarChart3, Eye, Plus, User, Settings, FileText, Calendar, DollarSign, Users, Building, Wrench, Inbox, type LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadCounts } from '@/hooks/maintenance/useUnreadCounts';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: number;
}

const tenantItems: SidebarItem[] = [
  { title: 'Dashboard', url: '/enhancedtenantdashboard', icon: Home },
  { title: 'Messages', url: '/enhancedtenantdashboard/messages', icon: MessageSquare },
  { title: 'Properties', url: '/enhancedtenantdashboard/properties', icon: Building },
  { title: 'Applications', url: '/enhancedtenantdashboard/applications', icon: Inbox },
  { title: 'Leases', url: '/enhancedtenantdashboard/leases', icon: FileText },
  { title: 'Maintenance', url: '/enhancedtenantdashboard/maintenance', icon: Settings },
  { title: 'Profile', url: '/enhancedtenantdashboard/profile', icon: User },
];

const landlordItems: SidebarItem[] = [
  { title: 'Rental Manager', url: '/enhancedlandlorddashboard', icon: Home },
  { title: 'Properties', url: '/enhancedlandlorddashboard/properties', icon: Building },
  { title: 'Messages', url: '/enhancedlandlorddashboard/messages', icon: MessageSquare },
  { title: 'Applications', url: '/enhancedlandlorddashboard/applications', icon: Inbox },
  { title: 'Leases', url: '/enhancedlandlorddashboard/leases', icon: FileText },
  { title: 'Tenants', url: '/enhancedlandlorddashboard/tenants', icon: Users },
  { title: 'Payments', url: '/enhancedlandlorddashboard/payments', icon: DollarSign },
  { title: 'Maintenance', url: '/enhancedlandlorddashboard/maintenance', icon: Wrench },
  { title: 'Reports', url: '/enhancedlandlorddashboard/reports', icon: BarChart3 },
];

interface EnhancedSidebarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export function EnhancedSidebar({ currentTab, onTabChange }: EnhancedSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLandlord } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { data: maintenanceUnread } = useUnreadCounts();
  const maintenanceTotal = maintenanceUnread
    ? Object.values(maintenanceUnread).reduce((a: number, b: number) => a + b, 0)
    : 0;
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';

  const items = isLandlord ? landlordItems : tenantItems;
  
  // Add unread count to messages and maintenance requests
  const itemsWithBadges = items.map((item) => ({
    ...item,
    badge:
      item.title === 'Messages'
        ? unreadCount
        : item.title === 'Maintenance'
        ? maintenanceTotal
        : undefined,
  }));

  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (currentTab && onTabChange) {
      return currentTab === path;
    }
    // Only exact match for the dashboard root to avoid double-highlighting
    if (path === '/enhancedlandlorddashboard' || path === '/enhancedtenantdashboard') {
      return currentPath === path;
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const handleItemClick = (item: SidebarItem) => {
    if (onTabChange) {
      onTabChange(item.url);
    } else {
      navigate(item.url);
    }
    // Auto-close sidebar on mobile after navigation
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-white to-earth-light/50 shadow-medium" side="left" variant="sidebar">
      <SidebarContent>
        {/* Logo */}
        <div className="p-6 border-b">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
<h1 className="text-xl font-bold">SwiftRent</h1>
          </button>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {isLandlord ? 'Landlord Panel' : 'Tenant Panel'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemsWithBadges.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url)}
                    className={
                      isActive(item.url) 
                        ? "bg-gradient-to-r from-ocean-blue to-ocean-blue-light hover:from-ocean-blue-dark hover:to-ocean-blue text-white shadow-soft" 
                        : "hover:bg-gradient-to-r hover:from-ocean-blue hover:to-success-green hover:text-white"
                    }
                  >
                    <button 
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between gap-3 px-6 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.title}</span>
                      </div>
                      {item.badge && item.badge > 0 && (
                        <Badge className="bg-earth-warm text-white border-white text-xs">
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Add Property Button - Only for landlords */}
        {isLandlord && (
          <div className="p-6 mt-auto">
            <Button 
              onClick={() => navigate('/list-property')} 
              className="w-full bg-gradient-to-r from-success-green to-success-green-glow hover:from-success-green-dark hover:to-success-green shadow-soft"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {!collapsed && "Add Property"}
            </Button>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

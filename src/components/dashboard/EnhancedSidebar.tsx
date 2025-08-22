import { Home, MessageSquare, BarChart3, Eye, Plus, User, Settings, FileText, Calendar, DollarSign, Users, Building } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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
  icon: any;
  badge?: number;
}

const tenantItems: SidebarItem[] = [
  { title: 'Dashboard', url: '/tenant-dashboard', icon: Home },
  { title: 'Messages', url: '/tenant-messages', icon: MessageSquare },
  { title: 'Properties', url: '/properties', icon: Building },
  { title: 'Applications', url: '/tenant-applications', icon: FileText },
  { title: 'Maintenance', url: '/maintenance', icon: Settings },
  { title: 'Profile', url: '/tenant-profile', icon: User },
];

const landlordItems: SidebarItem[] = [
  { title: 'Rental Manager', url: '/dashboard', icon: Home },
  { title: 'Properties', url: '/manage-properties', icon: Building },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Applications', url: '/applications', icon: FileText },
  { title: 'Tenants', url: '/tenants', icon: Users },
  { title: 'Payments', url: '/payments', icon: DollarSign },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
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
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const items = isLandlord ? landlordItems : tenantItems;
  
  // Add unread count to messages
  const itemsWithBadges = items.map(item => ({
    ...item,
    badge: item.title === 'Messages' ? unreadCount : undefined
  }));

  const currentPath = location.pathname;
  const isActive = (path: string) => {
    if (currentTab && onTabChange) {
      return currentTab === path;
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  };

  const handleItemClick = (item: SidebarItem) => {
    if (onTabChange) {
      onTabChange(item.url);
    } else {
      navigate(item.url);
    }
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-white to-earth-light/50 shadow-medium" side="left" variant="sidebar">
      <SidebarContent>
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <h1 className="text-xl font-bold">SwiftRent</h1>}
          </div>
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
                        : "hover:bg-earth-light/50 hover:text-earth-warm-dark"
                    }
                  >
                    <button 
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between gap-3 px-6 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </div>
                      {!collapsed && item.badge && item.badge > 0 && (
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

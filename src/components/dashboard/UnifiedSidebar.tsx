import { 
  Home, 
  MessageSquare, 
  FileText, 
  Wrench, 
  CreditCard, 
  HelpCircle, 
  Building, 
  Users, 
  BarChart3,
  Settings,
  Calendar
} from 'lucide-react';
import { RandIcon } from '@/components/icons/RandIcon';
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
import { Badge } from '@/components/ui/badge';

// Navigation items for different user roles
const tenantNavigationItems = [
  { title: 'Dashboard', url: '/tenant-dashboard', icon: Home, description: 'Overview & Quick Actions' },
  { title: 'Lease Documents', url: '/tenant-dashboard/lease-documents', icon: FileText, description: 'View & Download Lease' },
  { title: 'Maintenance', url: '/tenant-dashboard/maintenance', icon: Wrench, description: 'Submit & Track Requests' },
  { title: 'Messages', url: '/tenant-dashboard/messages', icon: MessageSquare, description: 'Chat with Landlord' },
  { title: 'Payments & Rent', url: '/tenant-dashboard/payments', icon: CreditCard, description: 'Payment History & Rent' },
  { title: 'Support & Help', url: '/tenant-dashboard/support', icon: HelpCircle, description: 'FAQ & Contact Support' },
];

const landlordNavigationItems = [
  { title: 'Dashboard', url: '/enhancedlandlorddashboard', icon: Home, description: 'Overview & Analytics' },
  { title: 'Properties', url: '/enhancedlandlorddashboard/properties', icon: Building, description: 'Manage Your Properties' },
  { title: 'Tenants', url: '/enhancedlandlorddashboard/tenants', icon: Users, description: 'Tenant Management' },
  { title: 'Messages', url: '/enhancedlandlorddashboard/messages', icon: MessageSquare, description: 'Communications' },
  { title: 'Payment Tracking', url: '/enhancedlandlorddashboard/payments', icon: RandIcon, description: 'Rent & Payment Management' },
  { title: 'Lease Management', url: '/enhancedlandlorddashboard/leases', icon: FileText, description: 'Lease Agreements' },
  { title: 'Maintenance', url: '/enhancedlandlorddashboard/maintenance', icon: Wrench, description: 'Maintenance Requests' },
  { title: 'Analytics', url: '/enhancedlandlorddashboard/reports', icon: BarChart3, description: 'SwiftBooks & Insights' },
  { title: 'Support', url: '/enhancedlandlorddashboard/support', icon: HelpCircle, description: 'Help & Resources' },
];

interface UnifiedSidebarProps {
  userRole: 'tenant' | 'landlord';
}

export function UnifiedSidebar({ userRole }: UnifiedSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { unreadCount } = useUnreadMessages();
  const collapsed = state === 'collapsed';

  const navigationItems = userRole === 'tenant' ? tenantNavigationItems : landlordNavigationItems;
  const currentPath = location.pathname;
  
  const isActive = (path: string) => {
    if (path === '/tenant-dashboard' || path === '/enhancedlandlorddashboard') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-sidebar to-sidebar/50 shadow-soft">
      <SidebarContent>
        {/* Logo Section */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold text-sidebar-foreground">SwiftRent</h1>
                <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole} Portal</p>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 py-3 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3">
              {navigationItems.map((item) => {
                const isItemActive = isActive(item.url);
                const showBadge = item.title === 'Messages' && unreadCount > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isItemActive}
                      className={`
                        group relative mb-1 rounded-lg transition-all duration-200
                        ${isItemActive 
                          ? "bg-gradient-to-r from-ocean-blue to-ocean-blue-light text-white shadow-soft hover:from-ocean-blue-dark hover:to-ocean-blue" 
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                        }
                      `}
                    >
                      <button 
                        onClick={() => handleNavigation(item.url)}
                        className="w-full flex items-center justify-start gap-3 px-4 py-3 text-left"
                      >
                        <div className="relative">
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          {showBadge && (
                            <Badge 
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-destructive text-destructive-foreground"
                            >
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                          )}
                        </div>
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{item.title}</span>
                              {showBadge && (
                                <Badge className="ml-2 bg-destructive text-destructive-foreground">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs opacity-70 truncate mt-0.5">{item.description}</p>
                          </div>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Actions Section - Only show when expanded */}
        {!collapsed && (
          <div className="mt-auto p-6">
            <div className="p-4 bg-gradient-to-r from-success-green/10 to-ocean-blue/10 rounded-lg border border-sidebar-border">
              <h3 className="text-sm font-semibold text-sidebar-foreground mb-2">
                {userRole === 'tenant' ? 'Need Help?' : 'Quick Actions'}
              </h3>
              <p className="text-xs text-sidebar-foreground/70 mb-3">
                {userRole === 'tenant' 
                  ? 'Contact support or browse our help center'
                  : 'Access frequently used features'
                }
              </p>
              <button
                onClick={() => navigate(userRole === 'tenant' ? '/tenant-dashboard/support' : '/enhancedlandlorddashboard/properties')}
                className="w-full px-3 py-2 bg-gradient-to-r from-ocean-blue to-ocean-blue-light text-white text-sm font-medium rounded-md hover:from-ocean-blue-dark hover:to-ocean-blue transition-all duration-200 shadow-soft"
              >
                {userRole === 'tenant' ? 'Get Support' : 'Add Property'}
              </button>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
import { Home, MessageSquare, FileText, DollarSign } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const tenantItems = [
  { title: 'Dashboard', url: '/tenant-dashboard', icon: Home },
  { title: 'Messages', url: '/tenant/messages', icon: MessageSquare },
  { title: 'My Leases', url: '#leases-section', icon: FileText, scrollTo: 'leases-section' },
  { title: 'Payments', url: '/tenant/payments', icon: DollarSign },
];

export function TenantSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  const handleNavigation = (item: typeof tenantItems[0]) => {
    if (item.scrollTo) {
      const el = document.getElementById(item.scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(item.url);
    }
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-white to-ocean-blue/10 shadow-medium">
      <SidebarContent>
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-success-green to-ocean-blue rounded flex items-center justify-center shadow-soft">
              <Home className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <h1 className="text-xl font-bold">SwiftRent</h1>}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tenant Panel
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tenantItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isActive(item.url) || (item.scrollTo && currentPath.includes('tenant-dashboard'))}
                    className={
                      isActive(item.url) || (item.scrollTo && currentPath.includes('tenant-dashboard'))
                        ? "bg-gradient-to-r from-success-green to-success-green-glow hover:from-success-green-dark hover:to-success-green text-white shadow-soft" 
                        : "hover:bg-ocean-blue/10 hover:text-ocean-blue-dark"
                    }
                  >
                    <button 
                      onClick={() => handleNavigation(item)}
                      className="w-full flex items-center justify-start gap-3 px-6 py-3"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
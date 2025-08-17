import { Home, MessageSquare, BarChart3, Eye, Plus, PenTool } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

const landlordItems = [
  { title: 'Properties', url: '/dashboard', icon: Home },
  { title: 'Messages', url: '/messages', icon: MessageSquare },
  { title: 'Payments', url: '/payments', icon: BarChart3 },
  { title: 'Alerts', url: '/alerts', icon: Eye },
];

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLandlord } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  return (
    <Sidebar className="border-r bg-gradient-to-b from-white to-earth-light/50 shadow-medium">
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
              {landlordItems.map((item) => (
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
                      onClick={() => navigate(item.url)}
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

        {/* Add Property Button - Only for landlords */}
        {isLandlord && (
          <div className="p-6 mt-auto">
            <Button 
              onClick={() => navigate('/dashboard/add-property')} 
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
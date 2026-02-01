import { NavLink, useLocation } from 'react-router-dom';
import { FileText, Users, Shield, LogOut, Home, UserCheck, Building, Flag, LayoutDashboard, Building2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const adminItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'Admin Users', url: '/admin/admin-users', icon: Shield },
  { title: 'Property Management', url: '/admin/properties', icon: Building },
  { title: 'Agency Management', url: '/admin/agencies', icon: Building2 },
  { title: 'Document Review', url: '/admin/documents', icon: FileText },
  { title: 'KYC Management', url: '/admin/kyc', icon: UserCheck },
  { title: 'Reports', url: '/admin/reports', icon: Flag },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <Shield className="h-4 w-4 mr-2" />
            Admin Panel
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                  <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-sidebar-accent/50">
                    <Home className="h-4 w-4" />
                    <span>Back to Site</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start h-8 px-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">Sign Out</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
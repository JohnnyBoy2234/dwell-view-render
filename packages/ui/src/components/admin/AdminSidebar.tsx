import { NavLink, useLocation } from 'react-router-dom';
import { FileText, Users, Shield, ShieldCheck, LogOut, Home, Building, Flag, LayoutDashboard, Headphones, ClipboardCheck, Banknote } from 'lucide-react';
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
} from '@mzanzihomes/ui/components/sidebar';
import { Button } from '@mzanzihomes/ui/components/button';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

const adminItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'User Management', url: '/admin/users', icon: Users },
  { title: 'Admin Users', url: '/admin/admin-users', icon: Shield },
  { title: 'Property Management', url: '/admin/properties', icon: Building },
  { title: 'Applications', url: '/admin/applications', icon: ClipboardCheck },
  { title: 'Leases & Contracts', url: '/admin/leases', icon: FileText },
  { title: 'Payments', url: '/admin/payments', icon: Banknote },
  { title: 'KYC Verification', url: '/admin/kyc', icon: ShieldCheck },
  { title: 'Document Review', url: '/admin/documents', icon: FileText },
  { title: 'Reports', url: '/admin/reports', icon: Flag },
  { title: 'Support Tickets', url: '/admin/support', icon: Headphones },
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
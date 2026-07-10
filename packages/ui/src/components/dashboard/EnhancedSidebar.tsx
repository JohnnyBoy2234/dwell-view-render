import React, { useState } from 'react';
import type { CSSProperties } from 'react';
import { Home, BarChart3, Eye, Plus, User, Settings, FileText, Calendar, Users, Building, Wrench, Inbox, Receipt, Camera, Lock, type LucideIcon } from 'lucide-react';
import { RIcon } from '@mzanzihomes/ui/components/icons/RIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useUnreadCounts } from '@mzanzihomes/supabase/hooks/useUnreadCounts';
import { useSubscription } from '@mzanzihomes/supabase/hooks/useSubscription';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@mzanzihomes/ui/components/tooltip';
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
} from '@mzanzihomes/ui/components/sidebar';
import { Button } from '@mzanzihomes/ui/components/button';
import { Badge } from '@mzanzihomes/ui/components/badge';

type PlanType = 'free' | 'pro' | 'premium';

interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  badge?: number;
  className?: string;
  requiredPlan?: PlanType;
  description?: string;
}

const tenantItems: SidebarItem[] = [
  { title: 'Overview', url: '/enhancedtenantdashboard', icon: Home },
  { title: 'Property Viewings', url: '/tenant/viewings', icon: Eye },
  { title: 'Inventory', url: '/tenant/inventory', icon: FileText },
  { title: 'Condition Records', url: '/tenant/condition-records', icon: Camera },
  { title: 'Maintenance', url: '/tenant/maintenance', icon: Settings },
  { title: 'Proof of Payment', url: '/tenant/proof-of-payment', icon: Inbox },
  { title: 'Lease Contracts', url: '/enhancedtenantdashboard/leases', icon: FileText },
  { title: 'Applications', url: '/tenant/applications', icon: Building },
  { title: 'Settings', url: '/tenant/profile', icon: User },
];

const landlordItems: SidebarItem[] = [
  { 
    title: 'Landlord Dashboard', 
    url: '/enhancedlandlorddashboard', 
    icon: Home,
    description: 'Your property management dashboard',
    requiredPlan: 'free'
  },
  { 
    title: 'Applications', 
    url: '/enhancedlandlorddashboard/applications', 
    icon: Inbox,
    description: 'View and manage rental applications',
    requiredPlan: 'pro'
  },
  { 
    title: 'Lease System', 
    url: '/enhancedlandlorddashboard/leases', 
    icon: FileText,
    description: 'Create and manage lease agreements',
    requiredPlan: 'pro'
  },
  { 
    title: 'Tenants', 
    url: '/enhancedlandlorddashboard/tenants', 
    icon: Users,
    description: 'Manage your tenants',
    requiredPlan: 'pro'
  },
  { 
    title: 'Payments', 
    url: '/enhancedlandlorddashboard/payments', 
    icon: RIcon,
    description: 'Track and manage rent payments',
    requiredPlan: 'pro'
  },
  { 
    title: 'Maintenance', 
    url: '/enhancedlandlorddashboard/maintenance', 
    icon: Wrench,
    description: 'Handle maintenance requests',
    requiredPlan: 'premium'
  },
  {
    title: 'Condition Records',
    url: '/enhancedlandlorddashboard/condition-records',
    icon: Camera,
    description: 'Photograph and attest property condition at move-in and move-out',
    requiredPlan: 'free'
  },
  { 
    title: 'SwiftBooks', 
    url: '/enhancedlandlorddashboard/swiftbooks', 
    icon: BarChart3,
    description: 'Financial reports and accounting',
    requiredPlan: 'premium'
  },
];

interface EnhancedSidebarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

const PLAN_NAMES = {
  free: 'Free',
  pro: 'Pro',
  premium: 'Premium'
} as const;

const PLAN_COLORS = {
  free: 'bg-gray-100 text-gray-800',
  pro: 'bg-blue-100 text-blue-800',
  premium: 'bg-purple-100 text-purple-800'
} as const;

export function EnhancedSidebar({ currentTab, onTabChange }: EnhancedSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLandlord, user } = useAuth();
  const { data: maintenanceUnread } = useUnreadCounts();
  const { toast } = useToast();
  const { plan, loading: subscriptionLoading } = useSubscription();
  const [showUpgradeTooltip, setShowUpgradeTooltip] = useState<string | null>(null);
  
  const maintenanceTotal = maintenanceUnread
    ? Object.values(maintenanceUnread).reduce((a: number, b: number) => a + b, 0)
    : 0;

  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';

  const items = isLandlord ? landlordItems : tenantItems;
  
  // Add unread count to messages and maintenance requests
  const itemsWithBadges = items.map((item) => {
    // Determine if feature is locked based on user's current plan
    let isLocked = false;
    if (item.requiredPlan === 'pro' && plan === 'free') {
      isLocked = true;
    } else if (item.requiredPlan === 'premium' && (plan === 'free' || plan === 'pro')) {
      isLocked = true;
    }
    
    return {
      ...item,
      badge: item.title === 'Maintenance' ? maintenanceTotal : undefined,
      isLocked,
      className: isLocked ? 'opacity-70' : ''
    };
  });

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

  const handleItemClick = (item: SidebarItem & { isLocked?: boolean }) => {
    // Check if the feature is locked
    if (item.isLocked) {
      setShowUpgradeTooltip(item.title);
      setTimeout(() => setShowUpgradeTooltip(null), 2000);
      
      toast({
        title: `Upgrade to ${item.requiredPlan === 'pro' ? 'Pro' : 'Premium'}`,
        description: `This feature requires the ${item.requiredPlan} plan.`,
        variant: 'default',
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
            View Plans
          </Button>
        ),
      });
      return;
    }

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
    <TooltipProvider delayDuration={300}>
      <Sidebar
        side="left"
        variant="sidebar"
        className="border-r-0"
        style={{
          '--sidebar-background': 'hsl(214, 65%, 12%)',
          '--sidebar-foreground': 'rgba(255,255,255,0.85)',
          '--sidebar-border': 'rgba(255,255,255,0.06)',
        } as React.CSSProperties}
      >
        <SidebarContent>
          {/* Logo */}
          <div className="px-5 py-5 border-b border-white/8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(214, 100%, 59%)' }}>
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-base tracking-tight">MzanziHomes</span>
            </button>
          </div>

          <SidebarGroup>
            <SidebarGroupLabel className="px-5 pt-5 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
              {isLandlord ? 'Landlord Panel' : 'Tenant Panel'}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="px-3 space-y-0.5">
                {itemsWithBadges.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={active
                          ? 'rounded-xl text-white'
                          : 'rounded-xl text-white/60 hover:text-white hover:bg-white/8'
                        }
                        style={active ? { background: 'hsl(214, 100%, 50%)' } : undefined}
                      >
                        <button
                          onClick={() => handleItemClick(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5"
                        >
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : item.isLocked ? 'text-white/30' : 'text-white/55'}`} />
                          <span className={`flex-1 text-left text-sm font-medium ${item.isLocked ? 'text-white/30' : ''}`}>
                            {item.title}
                          </span>
                          {item.isLocked && <Lock className="h-3 w-3 text-white/25 flex-shrink-0" />}
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Add Property Button */}
          {isLandlord && (
            <div className="px-4 pb-5 mt-auto pt-4">
              <button
                onClick={() => navigate('/list-property')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'hsl(142, 72%, 38%)' }}
              >
                <Plus className="h-4 w-4" />
                {!collapsed && 'Add Property'}
              </button>
            </div>
          )}
        </SidebarContent>
      </Sidebar>

      {/* Upgrade tooltip */}
      {showUpgradeTooltip && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span>Upgrade your plan to access {showUpgradeTooltip}</span>
        </div>
      )}
    </TooltipProvider>
  );
}

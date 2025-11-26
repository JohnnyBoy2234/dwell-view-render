import React, { useState } from 'react';
import { Home, BarChart3, Eye, Plus, User, Settings, FileText, Calendar, Users, Building, Wrench, Inbox, Receipt, Clipboard, Lock, type LucideIcon } from 'lucide-react';
import { RIcon } from '@/components/icons/RIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUnreadCounts } from '@/hooks/maintenance/useUnreadCounts';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  { title: 'Inspection', url: '/tenant/inspection', icon: Clipboard },
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
    title: 'Properties', 
    url: '/enhancedlandlorddashboard/properties', 
    icon: Building,
    description: 'Manage your properties',
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
    title: 'Inspection', 
    url: '/enhancedlandlorddashboard/inspection', 
    icon: Clipboard,
    description: 'Schedule and track property inspections',
    requiredPlan: 'pro'
  },
  { 
    title: 'SwiftBooks', 
    url: '/enhancedlandlorddashboard/reports', 
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
  const { unreadCount } = useUnreadMessages();
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
      badge:
        item.title === 'Messages'
          ? unreadCount
          : item.title === 'Maintenance'
          ? maintenanceTotal
          : undefined,
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
<h1 className="text-xl font-bold">RentLekker</h1>
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
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <item.icon className={`w-5 h-5 flex-shrink-0 ${item.isLocked ? 'text-muted-foreground' : ''}`} />
                          <span className={item.isLocked ? 'text-muted-foreground' : ''}>
                            {item.title}
                            {item.requiredPlan && item.requiredPlan !== 'free' && (
                              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${PLAN_COLORS[item.requiredPlan]}`}>
                                {PLAN_NAMES[item.requiredPlan]}
                              </span>
                            )}
                          </span>
                        </div>
                        {item.isLocked && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {item.badge !== undefined && item.badge > 0 ? (
                        <Badge className="bg-earth-warm text-white border-white text-xs ml-auto">
                          {item.badge > 99 ? '99+' : item.badge}
                        </Badge>
                      ) : null}
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
      
      {/* Upgrade tooltip for mobile */}
      {showUpgradeTooltip && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span>Upgrade your plan to access {showUpgradeTooltip}</span>
        </div>
      )}
    </TooltipProvider>
  );
}

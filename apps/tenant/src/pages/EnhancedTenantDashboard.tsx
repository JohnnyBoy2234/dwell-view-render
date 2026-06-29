import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@/components/dashboard/EnhancedDashboardLayout';
import { EnhancedSidebar } from '@/components/dashboard/EnhancedSidebar';
import { SidebarProvider } from '@mzanzihomes/ui/components/sidebar';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';
import { Separator } from '@mzanzihomes/ui/components/separator';
import {
  FileText, Eye, Settings, Building, User,
  Receipt, Clipboard, HelpCircle, MapPin,
  Calendar, AlertCircle, Clock,
} from 'lucide-react';
import { LeaseDashboard as LeaseDashboardComponent } from '@mzanzihomes/features/lease';
import { ImageWithSkeleton } from '@mzanzihomes/ui/components/ImageWithSkeleton';
import { ensureTwoHourViewingRemindersForTenant, ensureTwoHourViewingRemindersForLandlord } from '@/utils/viewingReminders';
import { VerificationGate } from '@/components/VerificationGate';
import { cn } from '@mzanzihomes/common/lib/utils';

// Hoisted outside component — stable reference, no re-creation on render
const FEATURE_BLOCKS = [
  { title: 'Viewings',         icon: Eye,       path: '/tenant/viewings',                  countKey: 'viewings'     as const },
  { title: 'Maintenance',      icon: Settings,  path: '/tenant/maintenance',               countKey: 'maintenance'  as const },
  { title: 'Inventory',        icon: FileText,  path: '/tenant/inventory' },
  { title: 'Inspection',       icon: Clipboard, path: '/tenant/inspection' },
  { title: 'Proof of Payment', icon: Receipt,   path: '/tenant/proof-of-payment' },
  { title: 'Lease Contracts',  icon: FileText,  path: '/enhancedtenantdashboard/leases' },
  { title: 'Applications',     icon: Building,  path: '/tenant/applications' },
  { title: 'Support',          icon: HelpCircle,path: '/tenant/support' },
  { title: 'Settings',         icon: User,      path: '/tenant/profile' },
] as const;

// Per-feature color palette — each tile gets its own tinted icon bg
const FEATURE_ICON_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'Viewings':         { bg: 'bg-blue-100',    icon: 'text-blue-600',    border: 'group-hover:border-blue-200'    },
  'Maintenance':      { bg: 'bg-orange-100',  icon: 'text-orange-500',  border: 'group-hover:border-orange-200'  },
  'Inventory':        { bg: 'bg-teal-100',    icon: 'text-teal-600',    border: 'group-hover:border-teal-200'    },
  'Inspection':       { bg: 'bg-violet-100',  icon: 'text-violet-600',  border: 'group-hover:border-violet-200'  },
  'Proof of Payment': { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'group-hover:border-emerald-200' },
  'Lease Contracts':  { bg: 'bg-indigo-100',  icon: 'text-indigo-600',  border: 'group-hover:border-indigo-200'  },
  'Applications':     { bg: 'bg-pink-100',    icon: 'text-pink-600',    border: 'group-hover:border-pink-200'    },
  'Support':          { bg: 'bg-amber-100',   icon: 'text-amber-600',   border: 'group-hover:border-amber-200'   },
  'Settings':         { bg: 'bg-slate-100',   icon: 'text-slate-500',   border: 'group-hover:border-slate-200'   },
};

export default function EnhancedTenantDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const [currentTab, setCurrentTab] = useState('/enhancedtenantdashboard');
  const { loading, rentDue, tenantProperty, recentMaintenance, upcomingViewings } =
    useTenantDashboard();

  useEffect(() => {
    if (user && isLandlord) {
      navigate('/enhancedlandlorddashboard');
      return;
    }
    const path = location.pathname;
    if (path !== '/enhancedtenantdashboard' && path.startsWith('/enhancedtenantdashboard')) {
      setCurrentTab(path);
    }
  }, [user, isLandlord, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;
    ensureTwoHourViewingRemindersForTenant(user.id, upcomingViewings || []);
    ensureTwoHourViewingRemindersForLandlord(user.id);
    const interval = setInterval(() => {
      ensureTwoHourViewingRemindersForTenant(user.id, upcomingViewings || []);
      ensureTwoHourViewingRemindersForLandlord(user.id);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, upcomingViewings]);

  const handleMakePayment = () => {
    if (rentDue) navigate(`/payment/${rentDue.tenancyId}`);
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    navigate(tab);
  };

  const renderTabContent = () => {
    if (currentTab === '/enhancedtenantdashboard/leases') {
      return (
        <div className="space-y-6 p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Lease System</h2>
            <Badge variant="secondary">Contract Management</Badge>
          </div>
          <LeaseDashboardComponent />
        </div>
      );
    }
    return renderDashboardContent();
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="p-4 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      );
    }

    const maintenanceCount = recentMaintenance?.length ?? 0;
    const viewingsCount = upcomingViewings?.length ?? 0;

    return (
      <div
        className="p-4 space-y-4"
        style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
      >
        {/* ── Property hero ──────────────────────────────────── */}
        {tenantProperty ? (
          <Card className="overflow-hidden animate-in fade-in slide-in-from-top-4 duration-400">
            {tenantProperty.images?.[0] && (
              <ImageWithSkeleton
                src={tenantProperty.images[0]}
                alt={tenantProperty.title}
                className="w-full h-32 object-cover"
                aspectRatio="16/9"
              />
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground text-base leading-tight truncate">
                    {tenantProperty.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tenantProperty.location}</span>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">Active Lease</Badge>
              </div>
              {tenantProperty.leaseEndDate && (
                <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Lease ends{' '}
                    {new Date(tenantProperty.leaseEndDate).toLocaleDateString('en-ZA', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="p-6 text-center">
            <Building className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No active lease</p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse properties to find your next home
            </p>
            <Button size="sm" className="mt-3" onClick={() => navigate('/properties')}>
              Browse Properties
            </Button>
          </Card>
        )}

        {/* ── Rent due ───────────────────────────────────────── */}
        {rentDue && (
          <Card
            className={cn(
              'border animate-in fade-in slide-in-from-left-4 duration-300',
              rentDue.status === 'overdue' && 'border-destructive/40 bg-destructive/5',
              rentDue.status === 'pending' && 'border-amber-500/40 bg-amber-500/5',
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {rentDue.status === 'overdue' ? (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {rentDue.status === 'overdue' ? 'Rent Overdue' : 'Rent Due'}
                    </span>
                    <Badge
                      variant={rentDue.status === 'overdue' ? 'destructive' : 'outline'}
                      className={cn(
                        'text-[10px]',
                        rentDue.status === 'pending' && 'border-amber-500 text-amber-600',
                      )}
                    >
                      {rentDue.status === 'overdue' ? 'Overdue' : 'Pending'}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    R {rentDue.amount.toLocaleString('en-ZA')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due{' '}
                    {new Date(rentDue.dueDate).toLocaleDateString('en-ZA', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={rentDue.status === 'overdue' ? 'destructive' : 'default'}
                  onClick={handleMakePayment}
                  className="shrink-0"
                >
                  Pay Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Section divider ────────────────────────────────── */}
        <div className="flex items-center gap-3 py-1">
          <Separator className="flex-1" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Quick Access
          </span>
          <Separator className="flex-1" />
        </div>

        {/* ── Feature grid ───────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {FEATURE_BLOCKS.map((block, i) => {
            const count =
              block.countKey === 'maintenance'
                ? maintenanceCount
                : block.countKey === 'viewings'
                ? viewingsCount
                : 0;
            const colors = FEATURE_ICON_COLORS[block.title] ?? {
              bg: 'bg-muted', icon: 'text-muted-foreground', border: 'group-hover:border-primary/30',
            };

            return (
              <button
                key={block.title}
                onClick={() => (!user ? navigate('/auth') : navigate(block.path))}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl animate-in fade-in slide-in-from-bottom-3 duration-300"
                style={{ animationDelay: `${i * 45}ms`, animationFillMode: 'backwards' }}
              >
                <Card className={cn('h-full transition-all duration-200 group-hover:shadow-md group-active:scale-95', colors.border)}>
                  <CardContent className="p-3 flex flex-col items-center gap-1.5 text-center">
                    <div className="relative mt-1">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 group-hover:scale-110', colors.bg)}>
                        <block.icon className={cn('w-5 h-5 transition-colors', colors.icon)} />
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full text-[9px] font-bold bg-destructive text-white flex items-center justify-center leading-none animate-in zoom-in-50 duration-200">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-foreground leading-tight">
                      {block.title}
                    </span>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <VerificationGate requireVerification={true}>
      <SidebarProvider>
        <div
          className="flex min-h-screen w-full overflow-hidden bg-background"
          style={{ minHeight: '100dvh' }}
        >
          <div className="hidden lg:flex lg:w-64 lg:flex-none">
            <EnhancedSidebar currentTab={currentTab} onTabChange={handleTabChange} />
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full">
            <EnhancedDashboardLayout
              title="Dashboard"
              currentTab={currentTab}
              onTabChange={handleTabChange}
            >
              {renderTabContent()}
            </EnhancedDashboardLayout>
          </div>
        </div>
      </SidebarProvider>
    </VerificationGate>
  );
}

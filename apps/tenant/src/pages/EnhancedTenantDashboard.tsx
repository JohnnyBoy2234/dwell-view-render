import * as React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EnhancedDashboardLayout } from '@mzanzihomes/ui/components/dashboard/EnhancedDashboardLayout';
import { EnhancedSidebar } from '@mzanzihomes/ui/components/dashboard/EnhancedSidebar';
import { SidebarProvider } from '@mzanzihomes/ui/components/sidebar';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@mzanzihomes/ui/components/card';
import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Skeleton } from '@mzanzihomes/ui/components/skeleton';
import { Separator } from '@mzanzihomes/ui/components/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import {
  FileText, Eye, Settings, Building, User,
  Receipt, Camera, HelpCircle, MapPin,
  Calendar, AlertCircle, Clock,
  CreditCard, MessageCircle, Wrench, Bell, Link2,
} from 'lucide-react';
import { LeaseDashboard as LeaseDashboardComponent } from '@mzanzihomes/features/lease';
import { ImageWithSkeleton } from '@mzanzihomes/ui/components/ImageWithSkeleton';
import { ensureTwoHourViewingRemindersForTenant, ensureTwoHourViewingRemindersForLandlord } from '@/utils/viewingReminders';
import { VerificationGate } from '@mzanzihomes/ui/components/VerificationGate';
import { cn } from '@mzanzihomes/common/lib/utils';

// Hoisted outside component — stable reference, no re-creation on render
const FEATURE_BLOCKS = [
  { title: 'Viewings',         icon: Eye,       path: '/tenant/viewings',                  countKey: 'viewings'     as const },
  { title: 'Maintenance',      icon: Settings,  path: '/tenant/maintenance',               countKey: 'maintenance'  as const },
  { title: 'Inventory',        icon: FileText,  path: '/tenant/inventory' },
  { title: 'Inspection List',  icon: Camera,   path: '/tenant/condition-records' },
  { title: 'Payment Records',  icon: Receipt,   path: '/tenant/proof-of-payment' },
  { title: 'Lease Contracts',  icon: FileText,  path: '/enhancedtenantdashboard/leases' },
  { title: 'Applications',     icon: Building,  path: '/tenant/applications' },
  { title: 'Support',          icon: HelpCircle,path: '/tenant/support' },
] as const;

// Per-feature color palette — each tile gets its own tinted icon bg
const FEATURE_ICON_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  'Viewings':         { bg: 'bg-blue-100',    icon: 'text-blue-600',    border: 'group-hover:border-blue-200'    },
  'Maintenance':      { bg: 'bg-orange-100',  icon: 'text-orange-500',  border: 'group-hover:border-orange-200'  },
  'Inventory':        { bg: 'bg-teal-100',    icon: 'text-teal-600',    border: 'group-hover:border-teal-200'    },
  'Inspection List': { bg: 'bg-violet-100', icon: 'text-violet-600',  border: 'group-hover:border-violet-200'  },
  'Payment Records':  { bg: 'bg-emerald-100', icon: 'text-emerald-600', border: 'group-hover:border-emerald-200' },
  'Lease Contracts':  { bg: 'bg-indigo-100',  icon: 'text-indigo-600',  border: 'group-hover:border-indigo-200'  },
  'Applications':     { bg: 'bg-pink-100',    icon: 'text-pink-600',    border: 'group-hover:border-pink-200'    },
  'Support':          { bg: 'bg-amber-100',   icon: 'text-amber-600',   border: 'group-hover:border-amber-200'   },
};

// One-line subtitle per tile, mirroring the landlord dashboard's tile style.
const FEATURE_SUBTITLE: Record<string, string> = {
  'Viewings':        'Upcoming & past',
  'Maintenance':     'Report an issue',
  'Inventory':       'Property items',
  'Inspection List': 'Photos & sign-off',
  'Payment Records': 'Bills & receipts',
  'Lease Contracts': 'View & sign',
  'Applications':    'Status & invites',
  'Support':         'Help & FAQs',
};

export default function EnhancedTenantDashboard() {
  const { user, isLandlord } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages();

  const [currentTab, setCurrentTab] = useState('/enhancedtenantdashboard');
  const { loading, rentDue, tenantProperty, hasSignedLease, recentMaintenance, upcomingViewings } =
    useTenantDashboard();

  // First-time welcome, shown right after a tenant joins via an invite.
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('tenantWelcome') === '1') {
      localStorage.removeItem('tenantWelcome');
      setShowWelcome(true);
    }
  }, []);

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

  const isLeasesTab = currentTab === '/enhancedtenantdashboard/leases';

  const renderTabContent = () => {
    if (isLeasesTab) {
      return (
        // Title lives in the dashboard app bar ("My Lease")
        <div className="space-y-6 p-4 sm:p-6">
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
          <Card className="overflow-hidden rounded-2xl border-0 shadow-md animate-in fade-in slide-in-from-top-4 duration-400">
            <div className="relative h-44 w-full">
              {tenantProperty.images?.[0] ? (
                <ImageWithSkeleton
                  src={tenantProperty.images[0]}
                  alt={tenantProperty.title}
                  className="w-full h-44 object-cover"
                  aspectRatio="16/9"
                />
              ) : (
                <div
                  className="h-44 w-full"
                  style={{ background: 'linear-gradient(135deg, hsl(214,100%,59%), hsl(214,86%,46%))' }}
                />
              )}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(6,12,24,0.85) 0%, rgba(6,12,24,0.15) 55%, transparent 100%)' }}
              />
              <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
                {hasSignedLease ? 'Active lease' : 'Connected'}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h2 className="break-words text-lg font-bold leading-tight text-white drop-shadow-sm">
                  {tenantProperty.title}
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-white/85">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tenantProperty.location}</span>
                </div>
              </div>
            </div>
            {(!hasSignedLease || tenantProperty.leaseEndDate) && (
              <CardContent className="p-3.5">
                {!hasSignedLease ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Link2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">You have been connected to this property</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Lease ends{' '}
                      {new Date(tenantProperty.leaseEndDate!).toLocaleDateString('en-ZA', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ) : (
          <Card className="rounded-2xl p-6 text-center">
            <Building className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No active lease</p>
            <p className="text-xs text-muted-foreground mt-1">
              Browse properties to find your next home
            </p>
            <Button size="sm" className="mt-3 rounded-xl" onClick={() => navigate('/properties')}>
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

        {/* ── Section heading ────────────────────────────────── */}
        <div className="px-1 pt-1">
          <h3 className="text-base font-bold text-foreground">Quick access</h3>
          <p className="text-xs text-muted-foreground">Everything for your tenancy</p>
        </div>

        {/* ── Feature grid ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
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
                className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-300"
                style={{ animationDelay: `${i * 45}ms`, animationFillMode: 'backwards' }}
              >
                <Card className={cn('h-full rounded-2xl border transition-all duration-200 group-hover:shadow-md group-active:scale-[0.98]', colors.border)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105', colors.bg)}>
                        <block.icon className={cn('w-6 h-6', colors.icon)} />
                      </div>
                      {count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold bg-destructive text-white flex items-center justify-center leading-none animate-in zoom-in-50 duration-200">
                          {count > 99 ? '99+' : count}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {block.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {FEATURE_SUBTITLE[block.title] ?? ''}
                      </p>
                    </div>
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
              title={isLeasesTab ? 'My Lease' : 'Dashboard'}
              subtitle={isLeasesTab ? 'View and sign your lease' : 'Your rental at a glance'}
              currentTab={currentTab}
              onTabChange={handleTabChange}
            >
              {renderTabContent()}
            </EnhancedDashboardLayout>
          </div>
        </div>

        {/* First-time "Your benefits" popup after joining via an invite */}
        <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Your benefits</DialogTitle>
              <DialogDescription>
                You're all connected. Here's everything you can now do from your dashboard:
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>Pay rent securely in-app with Paystack</span>
              </li>
              <li className="flex items-start gap-3">
                <Receipt className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>Receipts saved automatically in your POP section</span>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 shrink-0 text-blue-600" />
                <span>Message your landlord anytime</span>
              </li>
              <li className="flex items-start gap-3">
                <Wrench className="h-5 w-5 shrink-0 text-orange-500" />
                <span>Submit maintenance requests</span>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-5 w-5 shrink-0 text-indigo-600" />
                <span>View your lease &amp; documents</span>
              </li>
              <li className="flex items-start gap-3">
                <Bell className="h-5 w-5 shrink-0 text-amber-600" />
                <span>Get notified when rent is due</span>
              </li>
            </ul>
            <Button className="w-full mt-2" onClick={() => setShowWelcome(false)}>Got it</Button>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </VerificationGate>
  );
}

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
  Calendar, AlertCircle, Clock, CheckCircle2, Home,
  CreditCard, MessageCircle, Wrench, Bell, Link2,
  Menu, Search, Heart, ChevronRight, SlidersHorizontal, Navigation, ClipboardList,
} from 'lucide-react';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import { supabase } from '@mzanzihomes/supabase/client';
import heroImage from '@/assets/hero-background-new.jpg';
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

  const NAVY = 'linear-gradient(180deg, #12315f 0%, #0a1f45 100%)';
  const TILE_TINT: Record<string, string> = {
    'Viewings': 'bg-blue-50', 'Maintenance': 'bg-orange-50', 'Inventory': 'bg-emerald-50',
    'Inspection List': 'bg-violet-50', 'Payment Records': 'bg-green-50', 'Lease Contracts': 'bg-sky-50',
    'Applications': 'bg-pink-50', 'Support': 'bg-amber-50',
  };

  const renderDashboardContent = () => {
    const maintenanceCount = recentMaintenance?.length ?? 0;
    const viewingsCount = upcomingViewings?.length ?? 0;

    return (
      <div className="min-h-full" style={{ background: '#f4f7fb' }}>
        {/* ── Navy header ────────────────────────────────────── */}
        <div className="px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 18px)', background: NAVY }}>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full shadow-md" style={{ background: '#F59E0B' }}>
              <Home className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[26px] font-extrabold leading-tight text-white">Dashboard</h1>
              <p className="text-sm text-blue-200/80">Your rental at a glance</p>
            </div>
            <div className="ml-auto">
              <UserMenu />
            </div>
          </div>
        </div>

        {/* ── White sheet ────────────────────────────────────── */}
        <div
          className="relative z-10 -mt-8 rounded-t-[28px] px-4 pt-6"
          style={{ background: '#f4f7fb', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}
        >
          {/* Property card */}
          {tenantProperty ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_-22px_rgba(20,50,90,0.35)] animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="h-48 w-full bg-slate-100">
                {tenantProperty.images?.[0] ? (
                  <ImageWithSkeleton
                    src={tenantProperty.images[0]}
                    alt={tenantProperty.title}
                    className="h-48 w-full object-cover"
                    aspectRatio="16/9"
                  />
                ) : (
                  <div className="h-48 w-full" style={{ background: 'linear-gradient(135deg,#dfe7cf,#cdd8e6)' }} />
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="break-words text-[21px] font-extrabold leading-tight text-slate-900">{tenantProperty.title}</h2>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> {hasSignedLease ? 'Active lease' : 'Connected'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[15px] text-slate-500">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">{tenantProperty.location}</span>
                </div>
                {hasSignedLease && tenantProperty.leaseEndDate ? (
                  <div className="mt-2 flex items-center gap-2 text-[15px] text-slate-500">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    <span>
                      Lease ends{' '}
                      {new Date(tenantProperty.leaseEndDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2 text-[15px] text-slate-500">
                    <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">You have been connected to {tenantProperty.location || tenantProperty.title}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Building className="mx-auto mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-900">No active lease</p>
              <p className="mt-1 text-xs text-slate-500">Browse properties to find your next home</p>
              <Button size="sm" className="mt-3 rounded-xl" onClick={() => navigate('/properties')}>Browse Properties</Button>
            </div>
          )}

          {/* Quick Access divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Quick Access</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* 3-column tinted tiles */}
          <div className="grid grid-cols-3 gap-3">
            {FEATURE_BLOCKS.map((block, i) => {
              const count = block.countKey === 'maintenance' ? maintenanceCount : block.countKey === 'viewings' ? viewingsCount : 0;
              const colors = FEATURE_ICON_COLORS[block.title] ?? { bg: 'bg-slate-100', icon: 'text-slate-500', border: '' };
              const tint = TILE_TINT[block.title] ?? 'bg-slate-50';
              return (
                <button
                  key={block.title}
                  onClick={() => (!user ? navigate('/auth') : navigate(block.path))}
                  className={cn('relative flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.04] px-2 py-5 transition active:scale-95 animate-in fade-in slide-in-from-bottom-3 duration-300', tint)}
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'backwards' }}
                >
                  {count > 0 && (
                    <span className="absolute right-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                  <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', colors.bg)}>
                    <block.icon className={cn('h-6 w-6', colors.icon)} />
                  </span>
                  <span className="text-center text-[13px] font-bold leading-tight text-slate-800">{block.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating chat button */}
        <button
          onClick={() => navigate('/messages')}
          className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl active:scale-95"
          style={{ background: '#12315f' }}
          aria-label="Chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
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
              hideHeader={!isLeasesTab}
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

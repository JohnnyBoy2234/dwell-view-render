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

  // Home search + recommended listings feed.
  const [searchLocation, setSearchLocation] = useState('');
  const [dealType, setDealType] = useState<'rent' | 'buy'>('rent');
  const [recommended, setRecommended] = useState<any[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('properties')
        .select('id, title, location, price, images, listing_type')
        .eq('is_listed', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (active) setRecommended((data as any[]) || []);
    })();
    return () => { active = false; };
  }, []);

  const runSearch = () =>
    navigate(`/properties${searchLocation.trim() ? `?q=${encodeURIComponent(searchLocation.trim())}` : ''}`);

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

  const PAGE_BG = 'linear-gradient(180deg, #e9f1fc 0%, #f5f8fc 34%, #f5f8fc 100%)';
  const BADGE = ['bg-blue-600', 'bg-emerald-500', 'bg-orange-500'];

  const renderDashboardContent = () => {
    const maintenanceCount = recentMaintenance?.length ?? 0;

    const quick = [
      { label: 'My Rentals',   icon: Home,          bg: 'bg-blue-100',   fg: 'text-blue-600',   path: '/enhancedtenantdashboard/leases', badge: 0 },
      { label: 'Maintenance',  icon: Settings,      bg: 'bg-orange-100', fg: 'text-orange-500', path: '/tenant/maintenance',             badge: maintenanceCount },
      { label: 'Applications', icon: ClipboardList, bg: 'bg-green-100',  fg: 'text-green-600',  path: '/tenant/applications',            badge: 0 },
      { label: 'Messages',     icon: MessageCircle, bg: 'bg-violet-100', fg: 'text-violet-600', path: '/messages',                       badge: unreadCount || 0 },
      { label: 'Support',      icon: HelpCircle,    bg: 'bg-amber-100',  fg: 'text-amber-600',  path: '/tenant/support',                 badge: 0 },
    ];

    return (
      <div className="min-h-full" style={{ background: PAGE_BG }}>
        <div className="px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm" style={{ background: '#F59E0B' }}>
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-[22px] font-extrabold tracking-tight text-slate-900">Mzanzihomes</span>
            </div>
            <button
              onClick={() => navigate('/settings')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
          </div>

          {/* ── Hero ───────────────────────────────────────────── */}
          <div className="relative mt-4">
            <div className="pointer-events-none absolute -right-5 -top-3 h-[232px] w-[60%] overflow-hidden rounded-l-[30px]">
              <img
                src={heroImage}
                alt=""
                className="h-full w-full object-cover"
                style={{ WebkitMaskImage: 'linear-gradient(to left, black 62%, transparent)', maskImage: 'linear-gradient(to left, black 62%, transparent)' }}
              />
            </div>
            <div className="relative pt-3">
              <h1 className="text-[33px] font-extrabold leading-[1.08] tracking-tight text-slate-900">
                Find your perfect{' '}
                <span className="relative inline-block text-blue-600">
                  home
                  <span className="absolute -bottom-1 left-0 h-[6px] w-full rounded-full" style={{ background: '#F59E0B' }} />
                </span>{' '}
                in South Africa
              </h1>
              <p className="mt-4 max-w-[15rem] text-[15px] leading-snug text-slate-500">
                Verified listings. Direct landlords. Zero agent fees.
              </p>
              <div className="mt-5 inline-flex rounded-full bg-white p-1 shadow-sm">
                <button
                  onClick={() => setDealType('rent')}
                  className={cn('rounded-full px-7 py-2 text-sm font-bold transition', dealType === 'rent' ? 'bg-blue-600 text-white' : 'text-slate-500')}
                >
                  Rent
                </button>
                <button
                  onClick={() => setDealType('buy')}
                  className={cn('rounded-full px-7 py-2 text-sm font-bold transition', dealType === 'buy' ? 'bg-blue-600 text-white' : 'text-slate-500')}
                >
                  Buy
                </button>
              </div>
            </div>
          </div>

          {/* ── Search card ────────────────────────────────────── */}
          <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_20px_44px_-22px_rgba(20,50,90,0.4)]">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Location</p>
                <input
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  placeholder="City, suburb or area…"
                  className="w-full bg-transparent text-[15px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              <button onClick={runSearch} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-blue-600" aria-label="Use my location">
                <Navigation className="h-5 w-5" />
              </button>
            </div>

            <button
              onClick={() => navigate('/properties')}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left"
            >
              <SlidersHorizontal className="h-5 w-5 shrink-0 text-slate-600" />
              <span className="flex-1 text-[15px] font-semibold text-slate-800">More Filters</span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>

            <div className="mt-3 flex items-center gap-2.5">
              <button
                onClick={runSearch}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-[16px] font-bold text-white shadow-[0_14px_26px_-10px_rgba(37,99,235,0.75)] active:scale-[0.99]"
              >
                <Search className="h-5 w-5" /> Search Properties
              </button>
              <button
                onClick={() => navigate('/messages')}
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-blue-500 text-white active:scale-95"
                aria-label="Chat"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* ── Quick tiles ────────────────────────────────────── */}
          <div className="mt-5 grid grid-cols-5 gap-2.5">
            {quick.map((q) => (
              <button
                key={q.label}
                onClick={() => (!user ? navigate('/auth') : navigate(q.path))}
                className="relative flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-3.5 shadow-sm active:scale-95"
              >
                {q.badge > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {q.badge > 9 ? '9+' : q.badge}
                  </span>
                )}
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', q.bg)}>
                  <q.icon className={cn('h-[22px] w-[22px]', q.fg)} />
                </span>
                <span className="text-center text-[10.5px] font-semibold leading-tight text-slate-700">{q.label}</span>
              </button>
            ))}
          </div>

          {/* ── Recommended ────────────────────────────────────── */}
          <div className="mt-7 flex items-center justify-between">
            <h2 className="text-[20px] font-extrabold tracking-tight text-slate-900">Recommended for you</h2>
            <button onClick={() => navigate('/properties')} className="flex items-center gap-0.5 text-sm font-bold text-blue-600">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {recommended.length > 0 ? (
            <div className="-mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-2" style={{ scrollbarWidth: 'none' }}>
              {recommended.map((p, idx) => (
                <button
                  key={p.id ?? idx}
                  onClick={() => p.id && navigate(`/property/${p.id}`)}
                  className="w-[240px] shrink-0 overflow-hidden rounded-3xl bg-white text-left shadow-[0_18px_38px_-22px_rgba(20,50,90,0.4)] active:scale-[0.99]"
                >
                  <div className="relative h-40 w-full bg-slate-100">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#cdd8e6,#dfe7cf)' }} />
                    )}
                    <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow">
                      <Heart className="h-4 w-4 text-slate-700" />
                    </span>
                    <span className={cn('absolute bottom-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-white', BADGE[idx % 3])}>
                      {p.listing_type === 'sale' ? 'for sale' : 'for rent'}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="text-[17px] font-extrabold text-slate-900">
                      R {Number(p.price || 0).toLocaleString('en-ZA')}
                      {p.listing_type !== 'sale' && <span className="text-sm font-medium text-slate-400"> /month</span>}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{p.location || '—'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => navigate('/properties')}
              className="mt-3 flex w-full items-center justify-between rounded-3xl bg-white px-5 py-6 text-left shadow-sm"
            >
              <div>
                <p className="text-[15px] font-bold text-slate-900">Browse all properties</p>
                <p className="text-sm text-slate-500">Find your next home across South Africa</p>
              </div>
              <ChevronRight className="h-6 w-6 text-blue-600" />
            </button>
          )}
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

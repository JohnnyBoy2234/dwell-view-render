import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { cn } from '@mzanzihomes/common/lib/utils';
import { Button } from '@mzanzihomes/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import {
  ensureTwoHourViewingRemindersForTenant,
  ensureTwoHourViewingRemindersForLandlord,
} from '@/utils/viewingReminders';
import {
  Home, Search, MapPin, SlidersHorizontal, ChevronRight,
  Wrench, ClipboardCheck, MessageCircle, Receipt, FileText, ShieldCheck,
  Eye, Package, Camera, HelpCircle, Calendar, Link2, Building, CreditCard, Bell,
} from 'lucide-react';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import heroHouse from '@/assets/hero-house.jpg';

const PAGE_BG = '#f5f8fd';

// Every rental-management feature the tenant needs, one grid. `countKey` maps
// to a live badge (maintenance, viewings, messages); the rest have no badge.
const TILES = [
  { label: 'Viewings',        icon: Eye,            tint: 'bg-blue-50',    iconBg: 'bg-blue-100',    iconFg: 'text-blue-600',    path: '/tenant/viewings',          countKey: 'viewings' },
  { label: 'Maintenance',     icon: Wrench,         tint: 'bg-orange-50',  iconBg: 'bg-orange-100',  iconFg: 'text-orange-500',  path: '/tenant/maintenance',       countKey: 'maintenance' },
  { label: 'Applications',    icon: ClipboardCheck, tint: 'bg-pink-50',    iconBg: 'bg-pink-100',    iconFg: 'text-pink-600',    path: '/tenant/applications' },
  { label: 'Messages',        icon: MessageCircle,  tint: 'bg-violet-50',  iconBg: 'bg-violet-100',  iconFg: 'text-violet-600',  path: '/messages',                 countKey: 'messages' },
  { label: 'Payments',        icon: Receipt,        tint: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconFg: 'text-emerald-600', path: '/tenant/payments' },
  { label: 'Lease Contracts', icon: FileText,       tint: 'bg-sky-50',     iconBg: 'bg-indigo-100',  iconFg: 'text-indigo-600',  path: '/tenant/leases' },
  { label: 'Inventory',       icon: Package,        tint: 'bg-teal-50',    iconBg: 'bg-teal-100',    iconFg: 'text-teal-600',    path: '/tenant/inventory' },
  { label: 'Inspection List', icon: Camera,         tint: 'bg-rose-50',    iconBg: 'bg-rose-100',    iconFg: 'text-rose-600',    path: '/tenant/condition-records' },
  { label: 'Support',         icon: HelpCircle,     tint: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconFg: 'text-amber-600',   path: '/tenant/support' },
] as const;

/** The tenant "Home" tab and single hub: search-first marketplace up top,
 * the tenant's current rental, then a grid to every management feature. */
export default function TenantHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { tenantProperty, hasSignedLease, recentMaintenance, upcomingViewings } = useTenantDashboard();

  const [searchLocation, setSearchLocation] = useState('');
  const [dealType, setDealType] = useState<'rent' | 'buy'>('rent');

  // First-time welcome, shown right after a tenant joins via an invite.
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('tenantWelcome') === '1') {
      localStorage.removeItem('tenantWelcome');
      setShowWelcome(true);
    }
  }, []);

  // Viewing reminders (moved here from the retired dashboard so they keep
  // running from the tenant's primary screen).
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

  const maintenanceCount = recentMaintenance?.length ?? 0;
  const viewingsCount = upcomingViewings?.length ?? 0;
  const badgeFor = (key?: string) =>
    key === 'maintenance' ? maintenanceCount : key === 'viewings' ? viewingsCount : key === 'messages' ? (unreadCount || 0) : 0;

  const runSearch = () =>
    navigate(`/properties${searchLocation.trim() ? `?q=${encodeURIComponent(searchLocation.trim())}` : ''}`);

  const openTile = (path: string) => (!user ? navigate('/auth') : navigate(path));

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, minHeight: '100dvh' }}>
      <div className="px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full shadow-sm" style={{ background: '#2563EB' }}>
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-[22px] font-extrabold tracking-tight text-slate-900">MzanziHomes</span>
          </div>
          {user ? (
            <UserMenu variant="light" />
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-95"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Hero — villa photo bleeding in from the right, fading into the page */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-5 top-8 h-[352px] w-[62%]">
            <img
              src={heroHouse}
              alt=""
              className="h-full w-full object-cover object-left"
              style={{
                WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 80%)',
                maskImage: 'linear-gradient(to left, black 40%, transparent 80%)',
              }}
            />
          </div>
          <div className="relative pt-10">
            <h1 className="text-[34px] font-extrabold leading-[1.12] tracking-tight text-slate-900">
              Find your<br />
              perfect <span className="text-blue-600">home</span><br />
              in South Africa
            </h1>
            <p className="mt-4 max-w-[15.5rem] text-[15px] leading-relaxed text-slate-500">
              Verified listings. Direct landlords. Zero agent fees. MzanziHomes makes renting simple, safe, and transparent.
            </p>
            <div className="mt-5 inline-flex rounded-full bg-white p-1 shadow-sm">
              <button
                onClick={() => setDealType('rent')}
                className={cn('rounded-full px-7 py-2 text-sm font-bold transition', dealType === 'rent' ? 'bg-blue-600 text-white' : 'text-slate-600')}
              >
                Rent
              </button>
              <button
                onClick={() => setDealType('buy')}
                className={cn('rounded-full px-7 py-2 text-sm font-bold transition', dealType === 'buy' ? 'bg-blue-600 text-white' : 'text-slate-600')}
              >
                Buy
              </button>
            </div>
          </div>
        </div>

        {/* Search card — location · more filters · search, in one row */}
        <div className="relative mt-6 flex items-center gap-2 rounded-[24px] bg-white p-3 shadow-[0_20px_44px_-22px_rgba(20,50,90,0.4)]">
          <div className="flex min-w-0 flex-1 items-center gap-2 pl-1">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <MapPin className="h-[18px] w-[18px] text-blue-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Location</p>
              <input
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                placeholder="City, suburb or area…"
                className="w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            onClick={() => navigate('/properties')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 active:opacity-70"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-[18px] w-[18px] text-slate-600" />
          </button>
          <button
            onClick={runSearch}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-[0.98]"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        {/* Your rental — the tenant's connected property */}
        {tenantProperty && (
          <div className="mt-7">
            <h2 className="mb-2.5 text-[15px] font-extrabold tracking-tight text-slate-900">Your rental</h2>
            <button
              onClick={() => navigate('/tenant/leases')}
              className="flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-[0_14px_32px_-20px_rgba(20,50,90,0.4)] active:scale-[0.99]"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                {tenantProperty.images?.[0] ? (
                  <img src={tenantProperty.images[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ background: 'linear-gradient(135deg,#dfe7cf,#cdd8e6)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[15px] font-bold text-slate-900">{tenantProperty.title}</p>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {hasSignedLease ? 'Active' : 'Connected'}
                  </span>
                </div>
                <p className="mt-1 flex items-center gap-1 text-[13px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{tenantProperty.location}</span>
                </p>
                {hasSignedLease && tenantProperty.leaseEndDate && (
                  <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    Lease ends {new Date(tenantProperty.leaseEndDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          </div>
        )}

        {/* Manage — every rental feature in one grid */}
        <div className="mt-7">
          <h2 className="mb-3 text-[15px] font-extrabold tracking-tight text-slate-900">Manage your rental</h2>
          <div className="grid grid-cols-3 gap-3">
            {TILES.map((t) => {
              const badge = badgeFor((t as { countKey?: string }).countKey);
              return (
                <button
                  key={t.label}
                  onClick={() => openTile(t.path)}
                  className={cn('relative flex flex-col items-center gap-2.5 rounded-2xl border border-black/[0.04] px-2 py-5 transition active:scale-95', t.tint)}
                >
                  {badge > 0 && (
                    <span className="absolute right-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', t.iconBg)}>
                    <t.icon className={cn('h-6 w-6', t.iconFg)} />
                  </span>
                  <span className="text-center text-[13px] font-bold leading-tight text-slate-800">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Why rent with MzanziHomes */}
        <div className="mt-5 flex items-center gap-2.5 rounded-3xl p-3.5" style={{ background: '#e7effc' }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-slate-900">Why rent with MzanziHomes?</p>
            <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
              Connect directly with landlords, enjoy zero agent fees, and manage everything in one secure place.
            </p>
          </div>
          <button
            onClick={() => navigate('/learn-more')}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-blue-600 shadow-sm active:scale-95"
          >
            Learn more
          </button>
        </div>
      </div>

      {/* First-time "Your benefits" popup after joining via an invite */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Your benefits</DialogTitle>
            <DialogDescription>
              You're all connected. Here's everything you can now do from your home screen:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>Pay rent securely in-app with Paystack</span>
            </li>
            <li className="flex items-start gap-3">
              <Receipt className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>Receipts saved automatically in your payments section</span>
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
    </div>
  );
}

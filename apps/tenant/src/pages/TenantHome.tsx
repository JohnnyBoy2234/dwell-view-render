import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { useNotifications } from '@mzanzihomes/supabase/hooks/useNotifications';
import { useTenantDashboard } from '@/hooks/useTenantDashboard';
import { cn } from '@mzanzihomes/common/lib/utils';
import { Button } from '@mzanzihomes/ui/components/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@mzanzihomes/ui/components/dialog';
import {
  ensureTwoHourViewingRemindersForTenant,
  ensureTwoHourViewingRemindersForLandlord,
} from '@/utils/viewingReminders';
import {
  Home, Search, MapPin, SlidersHorizontal,
  Wrench, ClipboardCheck, MessageCircle, FileText, Headset, Receipt,
  Eye, Package, Camera, CreditCard, Bell,
} from 'lucide-react';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import { GlossyIcon, GLOSSY_TONES } from '@mzanzihomes/ui/components/GlossyIcon';
import { MoreFiltersModal } from '@mzanzihomes/ui/components/search/MoreFiltersModal';
import { usePropertySearchFilters } from '@mzanzihomes/ui/hooks/usePropertySearchFilters';
import HomeCarousel from '@/components/HomeCarousel';
import heroHouse from '@/assets/hero-house.jpg';

const PAGE_BG = '#f5f8fd';

// Every rental-management feature the tenant needs, one grid. `kind` ties a
// tile to the notification category that badges it (mirrors the app's
// notification-routing classifier); Messages badges from unread chats.
const TILES = [
  { label: 'Viewings',        desc: 'Manage your property viewings.',                                        icon: Eye,            tone: 'sapphire', path: '/tenant/viewings',          kind: 'viewing' },
  { label: 'Maintenance',     desc: 'Report maintenance issues and upload photos.',                          icon: Wrench,         tone: 'emerald',  path: '/tenant/maintenance',       kind: 'maintenance' },
  { label: 'Applications',    desc: 'View and manage your rental applications.',                             icon: ClipboardCheck, tone: 'orange',   path: '/tenant/applications',      kind: 'application' },
  { label: 'Messages',        desc: 'Securely message your landlord with immutable messages.',               icon: MessageCircle,  tone: 'purple',   path: '/messages',                 kind: 'message' },
  { label: 'Payments',        desc: 'Rent payments and transaction history.',                                icon: CreditCard,     tone: 'cyan',     path: '/tenant/payments',          kind: 'payment' },
  { label: 'Lease Contracts', desc: 'View, sign and securely store your online rental agreements.',          icon: FileText,       tone: 'indigo',   path: '/tenant/leases',            kind: 'lease' },
  { label: 'Inventory',       desc: 'View your property’s inventory, including furniture and recorded items.', icon: Package,        tone: 'teal',     path: '/tenant/inventory',         kind: 'inventory' },
  { label: 'Inspection List', desc: 'Keep permanent records of property inspections with photos, notes and condition reports.', icon: Camera, tone: 'ruby',  path: '/tenant/condition-records', kind: 'condition_record' },
] as const;

// Same normalisation the notification router uses (packages/ui notificationRoutes).
function notifKind(type?: string): string {
  const t = (type || '').toLowerCase();
  return t.includes('message') ? 'message'
    : t.includes('lease') ? 'lease'
    : (t.includes('application') || t.includes('offer')) ? 'application'
    : t.includes('viewing') ? 'viewing'
    : t.includes('maintenance') ? 'maintenance'
    : (t.includes('payment') || t.includes('billing')) ? 'payment'
    : t.includes('condition') ? 'condition_record'
    : t.includes('inventory') ? 'inventory'
    : t.includes('kyc') ? 'kyc'
    : 'other';
}

/** The tenant "Home" tab and single hub: search-first marketplace up top,
 * the tenant's current rental, then a grid to every management feature. */
export default function TenantHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();
  const { notifications, markAsRead } = useNotifications();
  const { upcomingViewings, hasSignedLease } = useTenantDashboard();
  const { filters, updateFilters, clearFilters, executeSearch } = usePropertySearchFilters();

  const [searchLocation, setSearchLocation] = useState('');
  const [dealType, setDealType] = useState<'rent' | 'buy'>('rent');
  const [pressedTile, setPressedTile] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  // Unread notifications grouped by tile category — these drive the tile
  // badges, exactly as they'd surface on the landlord dashboard tiles.
  const unreadByKind = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of notifications || []) {
      if ((n as any).is_read) continue;
      const k = notifKind((n as any).type);
      m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [notifications]);

  const badgeFor = (kind?: string) =>
    !kind ? 0 : kind === 'message' ? (unreadCount || 0) : (unreadByKind[kind] || 0);

  const runSearch = () =>
    navigate(`/properties${searchLocation.trim() ? `?q=${encodeURIComponent(searchLocation.trim())}` : ''}`);

  // Opening a tile clears its notifications (mark-as-read), like tapping into
  // the item from the landlord dashboard would.
  const openTile = (path: string, kind?: string) => {
    if (!user) { navigate('/auth'); return; }
    if (kind && kind !== 'message') {
      for (const n of notifications || []) {
        if (!(n as any).is_read && notifKind((n as any).type) === kind) markAsRead((n as any).id);
      }
    }
    navigate(path);
  };

  const totalUnread = (notifications || []).filter((n: any) => !n.is_read).length;
  const fullName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '') as string;
  const firstName = fullName ? fullName.split(/\s+/)[0].replace(/^\w/, (c) => c.toUpperCase()) : '';

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, minHeight: '100dvh' }}>
      <div className="px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>

        {/* Top row — brand · bell · account (clean white) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_8px_18px_-6px_rgba(37,99,235,0.6)]" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563EB)' }}>
              <Home className="h-6 w-6 text-white" />
            </div>
            <span className="text-[23px] font-extrabold tracking-tight text-slate-900">MzanziHomes</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate('/notifications')}
                className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-slate-700" />
                {totalUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: '#2563EB' }}>
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </button>
              <UserMenu variant="light" />
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="rounded-full px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-95"
              style={{ background: '#2563EB' }}
            >
              Sign in
            </button>
          )}
        </div>

        {/* Hero — headline on the left, house/family photo bleeding in from
            the right and fading to the left into the white page. */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-5 top-4 h-[356px] w-[62%] overflow-hidden">
            <img
              src={heroHouse}
              alt="A modern South African home"
              className="h-full w-full object-cover object-left"
              style={{
                WebkitMaskImage: 'linear-gradient(to left, black 42%, transparent 84%)',
                maskImage: 'linear-gradient(to left, black 42%, transparent 84%)',
              }}
            />
          </div>

          <div className="relative z-10 pt-8">
            <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-tight text-slate-900">
              Find your<br />
              perfect <span className="text-blue-600">home</span><br />
              in South Africa
            </h1>
            <p className="mt-4 max-w-[15.5rem] text-[15px] leading-relaxed text-slate-500">
              Verified listings. Direct landlords. Zero agent fees. MzanziHomes makes renting simple, safe, and transparent.
            </p>

            <div className="mt-6 inline-flex rounded-full bg-white p-1 shadow-[0_6px_18px_-8px_rgba(20,50,90,0.35)]">
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

        {/* Search card — location · more filters · search, in one row */}
        <div className="relative mt-7 flex items-center gap-2 rounded-[24px] bg-white p-3 shadow-[0_20px_44px_-22px_rgba(20,50,90,0.4)]">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-0.5">
            <GlossyIcon tone={GLOSSY_TONES.sapphire} icon={MapPin} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2563EB' }}>Location</p>
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
            onClick={() => { updateFilters({ searchTerm: searchLocation }); setFiltersOpen(true); }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-[18px] w-[18px] text-slate-600" />
          </button>
          <button
            onClick={runSearch}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-[0.98]"
            style={{ background: '#2563EB' }}
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        {/* Feature grid — heading depends on whether a lease exists yet */}
        <div className="mt-8">
          <h2 className="mb-3 text-[19px] font-extrabold tracking-tight text-slate-900">
            {hasSignedLease ? 'Manage your rental' : 'Everything you need to rent'}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {TILES.map((t) => {
              const kind = (t as { kind?: string }).kind;
              const badge = badgeFor(kind);
              return (
                <button
                  key={t.label}
                  onClick={() => openTile(t.path, kind)}
                  onPointerDown={() => setPressedTile(t.label)}
                  onPointerUp={() => setPressedTile(null)}
                  onPointerLeave={() => setPressedTile(null)}
                  onPointerCancel={() => setPressedTile(null)}
                  className="relative flex min-h-[78px] items-center gap-2.5 rounded-2xl bg-white p-3 text-left shadow-[0_12px_26px_-18px_rgba(20,50,90,0.45)] transition active:scale-[0.99]"
                >
                  {badge > 0 && (
                    <span className="absolute right-2 top-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  <GlossyIcon tone={GLOSSY_TONES[t.tone]} icon={t.icon} size={44} pressed={pressedTile === t.label} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold leading-tight text-slate-900">{t.label}</p>
                    <p className="mt-1 text-[10.5px] leading-tight text-slate-500">{t.desc}</p>
                  </div>
                </button>
              );
            })}

            {/* Support — full-width card to balance the grid */}
            <button
              onClick={() => openTile('/tenant/support')}
              onPointerDown={() => setPressedTile('Support')}
              onPointerUp={() => setPressedTile(null)}
              onPointerLeave={() => setPressedTile(null)}
              onPointerCancel={() => setPressedTile(null)}
              className="relative col-span-2 flex min-h-[78px] items-center gap-3.5 rounded-2xl bg-white p-3.5 text-left shadow-[0_12px_26px_-18px_rgba(20,50,90,0.45)] transition active:scale-[0.995]"
            >
              <GlossyIcon tone={GLOSSY_TONES.amber} icon={Headset} size={48} pressed={pressedTile === 'Support'} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold leading-tight text-slate-900">We&apos;re Here to Help You</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">
                  Our friendly team is always here to help. Whether you have a question, need guidance or need assistance using MzanziHomes, we&apos;re only a message away.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Homepage carousel (intro lives in slide 1) */}
        <div className="mt-8">
          <HomeCarousel />
        </div>
      </div>

      {/* More filters — search refinement sheet */}
      <MoreFiltersModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onFiltersChange={updateFilters}
        onApplyFilters={executeSearch}
        onClearFilters={clearFilters}
      />

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

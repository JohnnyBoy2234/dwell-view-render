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
  Home, Search, MapPin, SlidersHorizontal, ChevronRight,
  Wrench, ClipboardCheck, MessageCircle, Receipt, FileText, ShieldCheck,
  Eye, Package, Camera, HelpCircle, Calendar, Link2, Building, CreditCard, Bell,
} from 'lucide-react';
import { UserMenu } from '@mzanzihomes/ui/components/dashboard/UserMenu';
import { GlossyIcon, GLOSSY_TONES } from '@mzanzihomes/ui/components/GlossyIcon';
import heroHouse from '@/assets/hero-house.jpg';

const PAGE_BG = '#f5f8fd';

// Every rental-management feature the tenant needs, one grid. `kind` ties a
// tile to the notification category that badges it (mirrors the app's
// notification-routing classifier); Messages badges from unread chats.
const TILES = [
  { label: 'Viewings',        desc: 'Manage and track property viewings',   icon: Eye,            tone: 'sapphire', path: '/tenant/viewings',          kind: 'viewing' },
  { label: 'Maintenance',     desc: 'Report and track maintenance',         icon: Wrench,         tone: 'emerald',  path: '/tenant/maintenance',       kind: 'maintenance' },
  { label: 'Applications',    desc: 'View and manage rental applications',  icon: ClipboardCheck, tone: 'orange',   path: '/tenant/applications',      kind: 'application' },
  { label: 'Messages',        desc: 'Chat with your landlord',              icon: MessageCircle,  tone: 'purple',   path: '/messages',                 kind: 'message' },
  { label: 'Payments',        desc: 'Rent payments and transaction history',icon: Receipt,        tone: 'cyan',     path: '/tenant/payments',          kind: 'payment' },
  { label: 'Lease Contracts', desc: 'View and manage lease agreements',     icon: FileText,       tone: 'indigo',   path: '/tenant/leases',            kind: 'lease' },
  { label: 'Inventory',       desc: 'View property inventory',              icon: Package,        tone: 'teal',     path: '/tenant/inventory',         kind: 'inventory' },
  { label: 'Inspection List', desc: 'Property inspection and condition',    icon: Camera,         tone: 'ruby',     path: '/tenant/condition-records', kind: 'condition_record' },
  { label: 'Support',         desc: 'Get help and support',                 icon: HelpCircle,     tone: 'amber',    path: '/tenant/support' },
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
  const { tenantProperty, hasSignedLease, upcomingViewings } = useTenantDashboard();

  const [searchLocation, setSearchLocation] = useState('');
  const [dealType, setDealType] = useState<'rent' | 'buy'>('rent');
  const [pressedTile, setPressedTile] = useState<string | null>(null);

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

        {/* Hero — top row (Rent/Buy · bell · account) + greeting, over a
            property image bleeding into the top-right corner */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-5 -top-4 h-[280px] w-[60%] overflow-hidden rounded-bl-[40px]">
            <img
              src={heroHouse}
              alt=""
              className="h-full w-full object-cover"
              style={{
                WebkitMaskImage: 'linear-gradient(215deg, black 44%, transparent 82%)',
                maskImage: 'linear-gradient(215deg, black 44%, transparent 82%)',
              }}
            />
          </div>

          {/* Top row */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="inline-flex rounded-full bg-slate-100 p-1 shadow-sm">
              <button
                onClick={() => setDealType('rent')}
                className={cn('rounded-full px-6 py-2 text-sm font-bold transition', dealType === 'rent' ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(20,50,90,0.16)]' : 'text-slate-500')}
              >
                Rent
              </button>
              <button
                onClick={() => setDealType('buy')}
                className={cn('rounded-full px-6 py-2 text-sm font-bold transition', dealType === 'buy' ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(20,50,90,0.16)]' : 'text-slate-500')}
              >
                Buy
              </button>
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
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: '#7c3aed' }}>
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </button>
                <UserMenu variant="light" />
              </div>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="rounded-full px-5 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(109,40,217,0.7)] active:scale-95"
                style={{ background: '#6d28d9' }}
              >
                Sign in
              </button>
            )}
          </div>

          {/* Greeting */}
          <div className="relative z-10 mt-7 pb-2">
            <p className="text-[19px] font-medium text-slate-500">Welcome home,</p>
            <h1 className="text-[38px] font-extrabold leading-tight tracking-tight text-slate-900">
              {firstName || 'there'} <span className="align-baseline">👋</span>
            </h1>
          </div>
        </div>

        {/* Search card — location · more filters · search, in one row */}
        <div className="relative mt-4 flex items-center gap-2 rounded-[24px] bg-white p-3 shadow-[0_20px_44px_-22px_rgba(20,50,90,0.4)]">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 pl-0.5">
            <GlossyIcon tone={GLOSSY_TONES.sapphire} icon={MapPin} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Location</p>
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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 active:opacity-70"
            aria-label="More filters"
          >
            <SlidersHorizontal className="h-[18px] w-[18px] text-slate-600" />
          </button>
          <button
            onClick={runSearch}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(109,40,217,0.7)] active:scale-[0.98]"
            style={{ background: '#6d28d9' }}
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

        {/* Manage — every rental feature as a rectangle block */}
        <div className="mt-7">
          <h2 className="mb-3 text-[19px] font-extrabold tracking-tight text-slate-900">Manage your rental</h2>
          <div className="grid grid-cols-2 gap-3">
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
                  className="relative flex items-center gap-2.5 rounded-2xl bg-white p-3 text-left shadow-[0_12px_26px_-18px_rgba(20,50,90,0.45)] transition active:scale-[0.99]"
                >
                  {badge > 0 && (
                    <span className="absolute right-2 top-2 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                  <GlossyIcon tone={GLOSSY_TONES[t.tone]} icon={t.icon} size={46} pressed={pressedTile === t.label} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-extrabold leading-tight text-slate-900">{t.label}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">{t.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Why rent with MzanziHomes */}
        <div className="relative mt-5 overflow-hidden rounded-3xl p-4" style={{ background: '#efeaff' }}>
          <div className="pointer-events-none absolute -bottom-1 -right-3 h-[92px] w-[42%] overflow-hidden">
            <img
              src={heroHouse}
              alt=""
              className="h-full w-full rounded-2xl object-cover"
              style={{
                WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
                maskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
              }}
            />
          </div>
          <div className="relative flex items-start gap-3">
            <GlossyIcon tone={GLOSSY_TONES.purple} icon={ShieldCheck} size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-extrabold text-slate-900">Why rent with MzanziHomes?</p>
              <p className="mt-1 max-w-[15rem] text-[12px] leading-snug text-slate-600">
                Connect directly with landlords, enjoy zero agent fees, and manage everything in one secure place.
              </p>
              <button
                onClick={() => navigate('/learn-more')}
                className="mt-3 rounded-full px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_16px_-8px_rgba(109,40,217,0.7)] active:scale-95"
                style={{ background: '#6d28d9' }}
              >
                Learn more
              </button>
            </div>
          </div>
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

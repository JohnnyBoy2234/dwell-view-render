import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { cn } from '@mzanzihomes/common/lib/utils';
import {
  Home, Menu, Search, MapPin, SlidersHorizontal, ChevronRight,
  Wrench, ClipboardCheck, MessageCircle, Receipt, FileText, ShieldCheck,
} from 'lucide-react';
import heroHouse from '@/assets/hero-house.jpg';

const PAGE_BG = '#f5f8fd';

// The six feature tiles under the search card (2 rows × 3 columns).
const TILES = [
  { label: 'My Rentals',      desc: 'View your connected properties',  icon: Home,          iconBg: 'bg-blue-100',    iconFg: 'text-blue-600',    path: '/enhancedtenantdashboard' },
  { label: 'Maintenance',     desc: 'Track and manage requests',       icon: Wrench,        iconBg: 'bg-orange-100',  iconFg: 'text-orange-500',  path: '/tenant/maintenance' },
  { label: 'Applications',    desc: 'Track your applications',         icon: ClipboardCheck, iconBg: 'bg-emerald-100', iconFg: 'text-emerald-600', path: '/tenant/applications' },
  { label: 'Messages',        desc: 'Chat with your landlord',         icon: MessageCircle, iconBg: 'bg-violet-100',  iconFg: 'text-violet-600',  path: '/messages', showUnread: true },
  { label: 'Payments',        desc: 'View rent payments and history',  icon: Receipt,       iconBg: 'bg-green-100',   iconFg: 'text-green-600',   path: '/tenant/payments' },
  { label: 'Lease Contracts', desc: 'View and manage your leases',     icon: FileText,      iconBg: 'bg-violet-100',  iconFg: 'text-violet-600',  path: '/tenant/leases' },
] as const;

/** The tenant "Home" tab: search-first marketplace + quick access to rental admin. */
export default function TenantHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();

  const [searchLocation, setSearchLocation] = useState('');
  const [dealType, setDealType] = useState<'rent' | 'buy'>('rent');

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
          <button
            onClick={() => navigate('/settings')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:scale-95"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </button>
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
            className="flex shrink-0 items-center gap-1.5 border-l border-slate-100 py-1.5 pl-2.5 pr-1 text-[13px] font-semibold text-slate-700 active:opacity-70"
          >
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
            More Filters
          </button>
          <button
            onClick={runSearch}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-4 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-[0.98]"
          >
            <Search className="h-4 w-4" /> Search
          </button>
        </div>

        {/* Feature tiles */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {TILES.map((t) => {
            const badge = 'showUnread' in t && t.showUnread ? unreadCount || 0 : 0;
            return (
              <button
                key={t.label}
                onClick={() => openTile(t.path)}
                className="relative flex flex-col items-start gap-2.5 rounded-2xl bg-white p-3.5 text-left shadow-[0_12px_28px_-18px_rgba(20,50,90,0.35)] active:scale-[0.98]"
              >
                {badge > 0 && (
                  <span className="absolute right-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', t.iconBg)}>
                  <t.icon className={cn('h-[22px] w-[22px]', t.iconFg)} />
                </span>
                <span className="text-[15px] font-bold leading-tight text-slate-900">{t.label}</span>
                <span className="flex w-full items-end gap-1">
                  <span className="flex-1 text-[11.5px] leading-snug text-slate-500">{t.desc}</span>
                  <ChevronRight className="mb-0.5 h-4 w-4 shrink-0 text-slate-400" />
                </span>
              </button>
            );
          })}
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
            onClick={() => navigate('/tenant/support')}
            className="shrink-0 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-blue-600 shadow-sm active:scale-95"
          >
            Learn more
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@mzanzihomes/supabase/hooks/useUnreadMessages';
import { supabase } from '@mzanzihomes/supabase/client';
import { cn } from '@mzanzihomes/common/lib/utils';
import {
  Home, Settings, ClipboardList, MessageCircle, HelpCircle,
  Menu, Search, Heart, ChevronRight, SlidersHorizontal, Navigation, MapPin,
} from 'lucide-react';
import heroImage from '@/assets/hero-background-new.jpg';

const PAGE_BG = 'linear-gradient(180deg, #e9f1fc 0%, #f5f8fc 34%, #f5f8fc 100%)';
const BADGE = ['bg-blue-600', 'bg-emerald-500', 'bg-orange-500'];

/** Search-first tenant home (the "Home" tab). Discovery + quick access. */
export default function TenantHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages();

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

  const quick = [
    { label: 'My Rentals',   icon: Home,          bg: 'bg-blue-100',   fg: 'text-blue-600',   path: '/enhancedtenantdashboard', badge: 0 },
    { label: 'Maintenance',  icon: Settings,      bg: 'bg-orange-100', fg: 'text-orange-500', path: '/tenant/maintenance',      badge: 0 },
    { label: 'Applications', icon: ClipboardList, bg: 'bg-green-100',  fg: 'text-green-600',  path: '/tenant/applications',     badge: 0 },
    { label: 'Messages',     icon: MessageCircle, bg: 'bg-violet-100', fg: 'text-violet-600', path: '/messages',                badge: unreadCount || 0 },
    { label: 'Support',      icon: HelpCircle,    bg: 'bg-amber-100',  fg: 'text-amber-600',  path: '/tenant/support',          badge: 0 },
  ];

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, minHeight: '100dvh' }}>
      <div className="px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>

        {/* Header */}
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

        {/* Hero */}
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

        {/* Search card */}
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

        {/* Quick tiles */}
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

        {/* Recommended */}
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
}

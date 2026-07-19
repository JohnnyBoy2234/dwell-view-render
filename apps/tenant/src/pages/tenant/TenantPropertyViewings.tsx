// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, ChevronRight, Plus, Lightbulb, MessageCircle, Camera, HelpCircle, Contact } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { supabase } from '@mzanzihomes/supabase/client';

interface PropertyViewing {
  id: string;
  property_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
  property?: {
    id: string;
    title: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    images?: string[];
    landlord_id?: string;
  };
  landlord?: {
    display_name: string;
    phone?: string;
    user_id?: string;
  };
  landlord_id?: string;
  conversation_id?: string;
}

export default function TenantPropertyViewings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (user) {
      fetchViewings();
    }
  }, [user]);

  const fetchViewings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // PRODUCTION SCHEMA WARNING: the deployed viewing_slots is the old
      // booking-slot table (start_time/end_time/booked_by_tenant_id, status
      // available|booked|completed) — the proposal-style table in
      // 20250908173443 never applied remotely because of `if not exists`.
      // Query the shape production actually has; see types.ts.
      const { data: viewingSlots, error } = await supabase
        .from('viewing_slots')
        .select('id, property_id, landlord_id, start_time, end_time, status')
        .eq('booked_by_tenant_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      // Chat-confirmed viewings live in viewing_proposals, not viewing_slots
      const { data: proposals, error: proposalsError } = await supabase
        .from('viewing_proposals')
        .select('id, conversation_id, property_id, landlord_id, start_at, duration_minutes, status')
        .eq('tenant_id', user.id)
        .eq('status', 'confirmed')
        .order('start_at', { ascending: false });

      if (proposalsError) throw proposalsError;

      const allRecords = [
        ...(viewingSlots || []),
        ...(proposals || []).map(p => ({
          id: p.id,
          conversation_id: p.conversation_id,
          property_id: p.property_id,
          landlord_id: p.landlord_id,
          start_time: p.start_at,
          end_time: new Date(new Date(p.start_at).getTime() + (p.duration_minutes ?? 20) * 60000).toISOString(),
          status: 'confirmed'
        }))
      ];

      if (allRecords.length === 0) {
        setViewings([]);
        return;
      }

      // Fetch property details for each slot
      const propertyIds = [...new Set(allRecords.map(slot => slot.property_id))];
      
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, location, price, bedrooms, bathrooms, images, landlord_id')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      // Fetch landlord details
      const landlordIds = [...new Set(properties?.map(property => property.landlord_id).filter(Boolean) || [])];
      
      const { data: landlordProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, phone')
        .in('user_id', landlordIds);

      if (profilesError) throw profilesError;

      // Map the data to match the component's interface
      const mappedViewings: PropertyViewing[] = allRecords.map(slot => {
        const property = properties?.find(p => p.id === slot.property_id);
        const landlordProfile = landlordProfiles?.find(profile => profile.user_id === (slot.landlord_id || property?.landlord_id));
        
        return {
          id: slot.id,
          property_id: slot.property_id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: slot.status,
          conversation_id: slot.conversation_id,
          property: property ? {
            id: property.id,
            title: property.title,
            location: property.location,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            images: property.images,
            landlord_id: property.landlord_id
          } : undefined,
          landlord: landlordProfile ? {
            display_name: landlordProfile.display_name,
            phone: landlordProfile.phone,
            user_id: landlordProfile.user_id
          } : undefined
        };
      });

      setViewings(mappedViewings);
    } catch (error: any) {
      console.error('Error fetching viewings:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading viewings',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelViewing = async (viewingId: string) => {
    try {
      // Cancelling frees the slot for other tenants to book
      const { error } = await supabase
        .from('viewing_slots')
        .update({
          status: 'available',
          booked_by_tenant_id: null
        })
        .eq('id', viewingId)
        .eq('status', 'booked');

      if (error) throw error;

      toast({
        title: 'Viewing cancelled',
        description: 'The viewing has been cancelled successfully.'
      });

      fetchViewings(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error cancelling viewing',
        description: error.message
      });
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'booked':
        return { label: 'Upcoming', className: 'bg-blue-500 text-white' };
      case 'confirmed':
        return { label: 'Confirmed', className: 'bg-blue-500 text-white' };
      case 'completed':
        return { label: 'Completed', className: 'bg-success-green text-white' };
      case 'cancelled':
        return { label: 'Cancelled', variant: 'destructive' as const };
      default:
        return { label: status, variant: 'outline' as const };
    }
  };

  const viewingDateLine = (viewing: PropertyViewing) => {
    const day = new Date(viewing.start_time).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const time = (value: string) =>
      new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${day}, ${time(viewing.start_time)} – ${time(viewing.end_time)}`;
  };

  const viewingDetails = (viewing: PropertyViewing) =>
    [
      viewing.property?.location && { label: 'Location', value: viewing.property.location },
      viewing.property?.price && { label: 'Rent', value: `R${viewing.property.price.toLocaleString()}/month` },
      viewing.landlord?.display_name && { label: 'Landlord', value: viewing.landlord.display_name }
    ].filter(Boolean);

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const upcomingViewings = [...viewings]
    .filter(v => (v.status === 'booked' || v.status === 'confirmed') && isUpcoming(v.start_time))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const pastViewings = viewings.filter(
    v => !((v.status === 'booked' || v.status === 'confirmed') && isUpcoming(v.start_time))
  );

  const next = upcomingViewings[0];
  const list = tab === 'upcoming' ? upcomingViewings : pastViewings;

  const timeStr = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const relDay = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const tom = new Date(now); tom.setDate(now.getDate() + 1);
    if (sameDay(d, now)) return `Today at ${timeStr(iso)}`;
    if (sameDay(d, tom)) return `Tomorrow at ${timeStr(iso)}`;
    return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} at ${timeStr(iso)}`;
  };
  const rowDate = (iso: string) => {
    const d = new Date(iso);
    if (sameDay(d, new Date())) return `Today, ${timeStr(iso)}`;
    return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${timeStr(iso)}`;
  };
  const addr = (v: PropertyViewing) => v.property?.location || v.property?.title || 'Property';
  const pill = (status: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      confirmed: { cls: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
      booked:    { cls: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
      pending:   { cls: 'bg-amber-100 text-amber-700', label: 'Pending' },
      completed: { cls: 'bg-emerald-100 text-emerald-700', label: 'Completed' },
      cancelled: { cls: 'bg-red-100 text-red-600', label: 'Cancelled' },
    };
    return map[status] || { cls: 'bg-slate-100 text-slate-600', label: status };
  };
  const openViewing = (v?: PropertyViewing) => {
    if (!v) return;
    if (v.conversation_id) navigate(`/messages?c=${v.conversation_id}`);
    else if (v.property?.id && v.property.landlord_id) navigate(`/messages?propertyId=${v.property.id}&landlordId=${v.property.landlord_id}`);
    else if (v.property?.id) navigate(`/property/${v.property.id}`);
  };

  const TIPS = [
    { icon: Clock, label: 'Arrive on time' },
    { icon: Contact, label: 'Bring valid ID' },
    { icon: HelpCircle, label: 'Ask questions' },
    { icon: Camera, label: 'Take photos' },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="h-44 animate-pulse rounded-3xl bg-white/70" />
        <div className="h-64 animate-pulse rounded-3xl bg-white/70" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl pb-8">
      {/* Your next viewing (illustration shows even with no bookings yet) */}
      {(
        <div className="relative overflow-hidden rounded-3xl p-5" style={{ background: '#eaeefb' }}>
          <svg viewBox="0 0 170 140" className="pointer-events-none absolute -right-1 bottom-2 h-[124px] w-auto">
            <path d="M14 104 L34 84 L54 104 Z M22 104 v-14 h24 v14" fill="#c7d2f4" opacity="0.55" />
            <circle cx="70" cy="60" r="2" fill="#b9c6f0" /><circle cx="150" cy="52" r="2.5" fill="#b9c6f0" /><circle cx="60" cy="96" r="1.6" fill="#b9c6f0" />
            {/* calendar */}
            <rect x="52" y="30" width="76" height="76" rx="12" fill="#ffffff" stroke="#c7d2f4" strokeWidth="1.5" />
            <path d="M52 42 a12 12 0 0 1 12 -12 h52 a12 12 0 0 1 12 12 v8 h-76 z" fill="#3b5bdb" />
            <rect x="68" y="22" width="5" height="15" rx="2.5" fill="#2a3f9e" />
            <rect x="107" y="22" width="5" height="15" rx="2.5" fill="#2a3f9e" />
            <g fill="#dbe3fa">
              <rect x="62" y="60" width="15" height="12" rx="2.5" /><rect x="82" y="60" width="15" height="12" rx="2.5" /><rect x="102" y="60" width="15" height="12" rx="2.5" />
              <rect x="62" y="78" width="15" height="12" rx="2.5" /><rect x="82" y="78" width="15" height="12" rx="2.5" />
            </g>
            {/* clock */}
            <circle cx="122" cy="94" r="26" fill="#ffffff" stroke="#3b5bdb" strokeWidth="4.5" />
            <line x1="122" y1="94" x2="122" y2="78" stroke="#2a3f9e" strokeWidth="3.4" strokeLinecap="round" />
            <line x1="122" y1="94" x2="134" y2="94" stroke="#2a3f9e" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="122" cy="94" r="2.6" fill="#2a3f9e" />
          </svg>

          <div className="relative z-10 max-w-[58%]">
            {next ? (
              <>
                <p className="text-[13px] font-semibold text-slate-500">Your next viewing</p>
                <p className="mt-1 text-[25px] font-extrabold leading-tight text-blue-600">{relDay(next.start_time)}</p>
                <p className="mt-1 truncate text-[16px] font-bold text-slate-900">{addr(next)}</p>
                <span className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${pill(next.status).cls}`}>
                  {pill(next.status).label}
                </span>
                <div>
                  <button
                    onClick={() => openViewing(next)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-[0.98]"
                  >
                    View details <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold text-slate-500">Your viewings</p>
                <p className="mt-1 text-[23px] font-extrabold leading-tight text-slate-900">No viewings<br />scheduled yet</p>
                <p className="mt-2 text-[13px] leading-snug text-slate-500">Book a viewing on a property and it will show up here.</p>
                <div>
                  <button
                    onClick={() => navigate('/properties')}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-3 text-[14px] font-bold text-white shadow-[0_10px_20px_-8px_rgba(37,99,235,0.7)] active:scale-[0.98]"
                  >
                    Browse properties <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs + list — only when there's at least one viewing (the hero
          already carries the empty state, so no duplicate empty card). */}
      {viewings.length > 0 && (<>
      <div className="mt-6 flex items-center gap-7 border-b border-slate-200">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative pb-3 text-[15px] font-bold capitalize transition ${tab === t ? 'text-blue-600' : 'text-slate-400'}`}
          >
            {t}
            {tab === t && <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-blue-600" />}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4 overflow-hidden rounded-3xl bg-white shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
        {list.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-slate-400">No {tab} viewings.</p>
        ) : (
          list.map((v, i) => (
            <button
              key={v.id}
              onClick={() => openViewing(v)}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50 ${i > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50">
                <Calendar className="h-[18px] w-[18px] text-blue-600" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-bold text-slate-900">{rowDate(v.start_time)}</p>
                <p className="truncate text-[12.5px] text-slate-500">{addr(v)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold ${pill(v.status).cls}`}>{pill(v.status).label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </button>
          ))
        )}
      </div>
      </>)}

      {/* Viewing tips + reschedule */}
      <div className="mt-5 rounded-3xl bg-white p-5 shadow-[0_14px_32px_-22px_rgba(20,50,90,0.4)]">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          <h3 className="text-[16px] font-extrabold text-slate-900">Viewing Tips</h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
          {TIPS.map((t) => (
            <div key={t.label} className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <t.icon className="h-4 w-4 text-blue-600" />
              </span>
              <span className="text-[12.5px] font-medium text-slate-600">{t.label}</span>
            </div>
          ))}
        </div>
        <div className="my-4 h-px bg-slate-100" />
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold text-slate-900">Need to reschedule?</p>
            <p className="mt-1 max-w-[16rem] text-[12.5px] leading-snug text-slate-500">
              Contact the landlord as soon as possible if you need to change your viewing time.
            </p>
          </div>
          <button
            onClick={() => openViewing(next || upcomingViewings[0] || pastViewings[0])}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-blue-200 px-4 py-2.5 text-[13px] font-bold text-blue-600 active:scale-95"
          >
            <MessageCircle className="h-4 w-4" /> Chat now
          </button>
        </div>
      </div>

      {/* Floating add — browse to book a viewing */}
      <button
        onClick={() => navigate('/properties')}
        aria-label="Book a viewing"
        className="fixed bottom-6 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_14px_30px_-10px_rgba(37,99,235,0.8)] active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}


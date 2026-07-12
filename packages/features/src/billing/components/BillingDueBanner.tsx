// @ts-nocheck
import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

// Landlord counterpart of RentDueBanner: while any bill is awaiting the
// landlord's expenses, this stays pinned at the top of the app and links to
// the Payments page. Same --rent-banner-h contract as RentDueBanner (the two
// banners live in different apps, so the variable never double-books).
function useBannerHeightVar(visible: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const root = document.documentElement;
    if (!visible || !ref.current) {
      root.style.setProperty('--rent-banner-h', '0px');
      return;
    }
    const el = ref.current;
    const update = () => root.style.setProperty('--rent-banner-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--rent-banner-h', '0px');
    };
  }, [visible]);
  return ref;
}

function useAwaitingBills() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['awaiting-bills', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('id, period, properties(title, location)')
        .eq('landlord_id', user!.id)
        .eq('status', 'awaiting_landlord')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('awaiting-bills-watch')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_bills', filter: `landlord_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['awaiting-bills', user.id] });
          queryClient.invalidateQueries({ queryKey: ['monthly-bills'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

export function BillingDueBanner() {
  const { data: bills } = useAwaitingBills();
  const navigate = useNavigate();
  const location = useLocation();

  const bannerRef = useBannerHeightVar(!!bills?.length);

  if (!bills?.length) return null;

  const first = bills[0];
  const propertyName = first.properties?.title || first.properties?.location || 'your property';
  const monthName = new Date(`${first.period}-01`).toLocaleDateString('en-ZA', { month: 'long' });
  const onPaymentsPage = location.pathname.startsWith('/enhancedlandlorddashboard/payments');

  return (
    <button
      ref={bannerRef}
      onClick={() => { if (!onPaymentsPage) navigate('/enhancedlandlorddashboard/payments'); }}
      className="sticky top-0 z-50 flex w-full items-center justify-between gap-3 bg-amber-500 px-4 py-2.5 text-left text-white"
      aria-label={`Billing due for ${propertyName} — prepare and send the bill`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">
          {bills.length > 1
            ? `${bills.length} properties need billing`
            : `Time to bill — ${propertyName}`}
        </span>
        <span className="block text-xs opacity-90">
          {monthName}: add this month's expenses and send the bill to your tenant
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-amber-600">
        Do the bill
      </span>
    </button>
  );
}

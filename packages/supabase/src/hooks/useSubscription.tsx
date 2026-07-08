import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { normalizePlan, isActiveSubscriber, type NormalizedPlan } from '@mzanzihomes/common/utils/planAccess';

/** @deprecated legacy tier names — normalized to 'free' | 'subscriber' internally */
export type PlanType = 'free' | 'pro' | 'premium' | 'subscriber';

export function useSubscription() {
  const { user } = useAuth();
  // Raw plan code as stored in the DB (may be legacy 'pro'/'premium'); normalized on return.
  const [rawPlan, setRawPlan] = useState<string | null>('free');
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [planLastSyncedAt, setPlanLastSyncedAt] = useState<string | null>(null);

  const loadSubscription = useCallback(async (showSpinner = false) => {
    if (!user) {
      setRawPlan('free');
      setPlanStatus('inactive');
      setPlanExpiresAt(null);
      setPlanLastSyncedAt(null);
      setLoading(false);
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }

    try {
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('plan, plan_status, plan_expires_at, plan_last_synced')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        const rawPlanCode = ((profile as any).plan ?? 'free') as string;
        const status = ((profile as any).plan_status ?? 'inactive').toLowerCase();
        const expiresAt = (profile as any).plan_expires_at ?? null;

        setPlanStatus(status);
        setPlanExpiresAt(expiresAt);
        setPlanLastSyncedAt((profile as any).plan_last_synced ?? null);

        if (isActiveSubscriber({ plan: rawPlanCode, planStatus: status, planExpiresAt: expiresAt })) {
          setRawPlan(rawPlanCode);
          return;
        }
      }

      const { data, error } = await (supabase as any)
        .from('billing_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.log('[useSubscription] No active subscription found, setting to free plan');
        setRawPlan('free');
        setPlanStatus('inactive');
        setPlanExpiresAt(null);
        setPlanLastSyncedAt(null);
      } else {
        const planCode = (data.plan_code as string)?.toLowerCase() || '';
        console.log('[useSubscription] Active subscription found:', {
          plan_code: data.plan_code,
          status: data.status,
          user_id: data.user_id
        });

        setRawPlan(planCode);
        setPlanStatus((data.status as string) ?? 'active');
        setPlanExpiresAt((data.current_period_end as string) ?? null);
        setPlanLastSyncedAt((data.updated_at as string) ?? null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setRawPlan('free');
      setPlanStatus('inactive');
      setPlanExpiresAt(null);
      setPlanLastSyncedAt(null);
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRawPlan('free');
      setPlanStatus('inactive');
      setPlanExpiresAt(null);
      setPlanLastSyncedAt(null);
      setLoading(false);
      return;
    }

    loadSubscription(true);

    const profileChannel = supabase
      .channel(`profile-plan-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadSubscription(false);
        }
      )
      .subscribe();

    const subscriptionChannel = supabase
      .channel(`subscription-plan-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadSubscription(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(subscriptionChannel);
    };
  }, [user, loadSubscription]);

  const refresh = useCallback(async () => {
    await loadSubscription(true);
  }, [loadSubscription]);

  const plan: NormalizedPlan = normalizePlan(rawPlan);
  const isSubscriber = isActiveSubscriber({
    plan: rawPlan,
    planStatus,
    planExpiresAt,
  });

  return {
    plan,                 // 'free' | 'subscriber'
    isSubscriber,         // the one flag the app should use
    planStatus: planStatus ?? null,
    planExpiresAt: planExpiresAt ?? null,
    planLastSyncedAt,
    loading,
    refresh,
  };
}

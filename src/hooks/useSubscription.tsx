import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlanType = 'free' | 'pro' | 'premium';

interface Subscription {
  plan: PlanType;
  planStatus: string | null;
  planExpiresAt: string | null;
  planLastSyncedAt: string | null;
  loading: boolean;
  isFreePlan: boolean;
  isProPlan: boolean;
  isPremiumPlan: boolean;
  hasAccess: (requiredPlan: PlanType) => boolean;
  refresh: () => Promise<void>;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

const normalizePlanCode = (code?: string | null): PlanType => {
  const value = (code ?? '').toLowerCase();
  if (value.includes('premium')) return 'premium';
  if (value.includes('pro')) return 'pro';
  return 'free';
};

export function useSubscription(): Subscription {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [loading, setLoading] = useState(true);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [planLastSyncedAt, setPlanLastSyncedAt] = useState<string | null>(null);

  const loadSubscription = useCallback(async (showSpinner = false) => {
    if (!user) {
      setPlan('free');
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, plan_status, plan_expires_at, plan_last_synced')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profileError && profile) {
        const normalizedPlan = normalizePlanCode(profile.plan);
        const status = (profile.plan_status ?? 'inactive').toLowerCase();

        setPlanStatus(status);
        setPlanExpiresAt(profile.plan_expires_at ?? null);
        setPlanLastSyncedAt(profile.plan_last_synced ?? null);

        if (ACTIVE_STATUSES.has(status)) {
          setPlan(normalizedPlan);
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
        setPlan('free');
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

        setPlan(normalizePlanCode(planCode));
        setPlanStatus((data.status as string) ?? 'active');
        setPlanExpiresAt((data.current_period_end as string) ?? null);
        setPlanLastSyncedAt((data.updated_at as string) ?? null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setPlan('free');
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
      setPlan('free');
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

  const hasAccess = (requiredPlan: PlanType): boolean => {
    return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requiredPlan];
  };

  const refresh = useCallback(async () => {
    await loadSubscription(true);
  }, [loadSubscription]);

  return {
    plan,
    planStatus,
    planExpiresAt,
    planLastSyncedAt,
    loading,
    isFreePlan: plan === 'free',
    isProPlan: plan === 'pro',
    isPremiumPlan: plan === 'premium',
    hasAccess,
    refresh,
  };
}


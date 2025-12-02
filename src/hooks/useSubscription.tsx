import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlanType = 'free' | 'pro' | 'premium';

interface Subscription {
  plan: PlanType;
  loading: boolean;
  isFreePlan: boolean;
  isProPlan: boolean;
  isPremiumPlan: boolean;
  hasAccess: (requiredPlan: PlanType) => boolean;
}

const PLAN_HIERARCHY: Record<PlanType, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

export function useSubscription(): Subscription {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanType>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan('free');
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        const result = await (supabase as any)
          .from('billing_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();
        
        const { data, error } = result;

        if (error || !data) {
          console.log('[useSubscription] No active subscription found, setting to free plan');
          setPlan('free');
        } else {
          // Map plan codes to our plan types
          const planCode = (data.plan_code as string)?.toLowerCase() || '';
          console.log('[useSubscription] Active subscription found:', {
            plan_code: data.plan_code,
            status: data.status,
            user_id: data.user_id
          });
          
          if (planCode.includes('premium')) {
            console.log('[useSubscription] Setting plan to: premium');
            setPlan('premium');
          } else if (planCode.includes('pro')) {
            console.log('[useSubscription] Setting plan to: pro');
            setPlan('pro');
          } else {
            console.log('[useSubscription] Unknown plan code, defaulting to: free');
            setPlan('free');
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setPlan('free');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();

    // Subscribe to changes
    const channel = supabase
      .channel('subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'billing_subscriptions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const hasAccess = (requiredPlan: PlanType): boolean => {
    return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[requiredPlan];
  };

  return {
    plan,
    loading,
    isFreePlan: plan === 'free',
    isProPlan: plan === 'pro',
    isPremiumPlan: plan === 'premium',
    hasAccess,
  };
}

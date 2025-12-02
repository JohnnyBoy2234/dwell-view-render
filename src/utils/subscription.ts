// src/utils/subscription.ts
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free' | 'pro' | 'premium';

export const getSubscriptionStatus = async (userId: string) => {
  if (!userId) {
    return { plan: 'free' as const, isValid: false };
  }

  try {
    const { data, error } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return { plan: 'free' as const, isValid: false };
    }

    const now = new Date();
    const periodEnd = new Date(data.current_period_end || 0);
    const isActive = data.status === 'active' || 
                    (data.status === 'trialing' && now < periodEnd);

    if (!isActive) {
      return { plan: 'free' as const, isValid: false };
    }

    // Map plan codes to our plan types
    const planCode = (data.plan_code as string)?.toLowerCase() || '';
    let plan: PlanType = 'free';
    
    if (planCode.includes('premium')) {
      plan = 'premium';
    } else if (planCode.includes('pro')) {
      plan = 'pro';
    }

    return { 
      plan,
      isValid: true,
      subscription: data,
      expiresAt: periodEnd,
      isTrial: data.status === 'trialing'
    };

  } catch (error) {
    console.error('Error checking subscription status:', error);
    return { plan: 'free' as const, isValid: false };
  }
};
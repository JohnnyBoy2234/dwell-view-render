import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused';
type PlanType = 'free' | 'pro' | 'premium';

interface Subscription {
  id: string;
  status: SubscriptionStatus;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  plan_code: string;
}

export class SubscriptionService {
  private static readonly GRACE_PERIOD_DAYS = 7; // 7-day grace period for expired subscriptions

  /**
   * Check if a subscription is active (including grace period)
   */
  static isSubscriptionActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;

    // Check if subscription is in grace period
    if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      const gracePeriodEnd = new Date(subscription.current_period_end);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.GRACE_PERIOD_DAYS);
      
      return new Date() <= gracePeriodEnd;
    }

    // Active or trialing subscriptions
    return ['active', 'trialing'].includes(subscription.status);
  }

  /**
   * Check if subscription is in trial period
   */
  static isInTrial(subscription: Subscription | null): boolean {
    if (!subscription || !subscription.trial_end) return false;
    return new Date() < new Date(subscription.trial_end);
  }

  /**
   * Check if subscription is canceled but still active until period end
   */
  static isCanceledButActive(subscription: Subscription | null): boolean {
    if (!subscription) return false;
    return subscription.cancel_at_period_end && this.isSubscriptionActive(subscription);
  }

  /**
   * Get the effective plan based on subscription status
   */
  static getEffectivePlan(subscription: Subscription | null): PlanType {
    if (!subscription || !this.isSubscriptionActive(subscription)) {
      return 'free';
    }

    // During trial, grant full access
    if (this.isInTrial(subscription)) {
      return 'premium';
    }

    // Map plan codes to plan types
    if (subscription.plan_code.toLowerCase().includes('premium')) {
      return 'premium';
    } else if (subscription.plan_code.toLowerCase().includes('pro')) {
      return 'pro';
    }

    return 'free';
  }

  /**
   * Get the number of days until subscription expires
   */
  static getDaysUntilExpiration(subscription: Subscription | null): number | null {
    if (!subscription) return null;
    
    const now = new Date();
    const endDate = new Date(subscription.current_period_end);
    
    // If already expired
    if (now > endDate) return 0;
    
    const diffTime = endDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Handle subscription status changes and show appropriate UI feedback
   */
  static handleSubscriptionStatusChange(subscription: Subscription | null) {
    if (!subscription) {
      // No subscription found, user is on free plan
      toast({
        title: "Free Plan Active",
        description: "You're currently on the free plan. Upgrade to unlock all features.",
        variant: "default",
      });
      return;
    }

    if (this.isInTrial(subscription)) {
      const trialEnd = new Date(subscription.trial_end!).toLocaleDateString();
      toast({
        title: "Trial Active",
        description: `Your trial ends on ${trialEnd}. Enjoy full access until then!`,
        variant: "default",
      });
      return;
    }

    if (subscription.status === 'past_due') {
      const daysLeft = this.getDaysUntilExpiration(subscription);
      toast({
        title: "Payment Required",
        description: `Your subscription is past due. Please update your payment method to avoid service interruption. ${daysLeft} days remaining.`,
        variant: "destructive",
      });
      return;
    }

    if (this.isCanceledButActive(subscription)) {
      const daysLeft = this.getDaysUntilExpiration(subscription);
      toast({
        title: "Subscription Ending",
        description: `Your subscription will end in ${daysLeft} days. You'll lose access to premium features.`,
        variant: "default",
      });
      return;
    }

    if (!this.isSubscriptionActive(subscription)) {
      toast({
        title: "Subscription Inactive",
        description: "Your subscription is no longer active. Please renew to continue using premium features.",
        variant: "destructive",
      });
    }
  }

  /**
   * Handle downgrade flow - clean up premium features
   */
  static async handleDowngrade(userId: string, previousPlan: PlanType, newPlan: PlanType) {
    // Only handle downgrades, not upgrades or same plan
    if (previousPlan === newPlan || 
        (previousPlan === 'free' && newPlan !== 'free') ||
        (previousPlan === 'pro' && newPlan === 'premium')) {
      return;
    }

    try {
      // Notify user about the downgrade
      toast({
        title: "Plan Changed",
        description: `You've been downgraded to the ${newPlan} plan. Some features may no longer be available.`,
        variant: "default",
      });

      // In a real app, you might want to:
      // 1. Archive or mark premium data as read-only
      // 2. Notify support/admin about the downgrade
      // 3. Clean up any premium-specific data if needed
      
      // Example: Archive premium data if downgrading from premium to free
      if (previousPlan === 'premium' && newPlan === 'free') {
        await this.archivePremiumData(userId);
      }

    } catch (error) {
      console.error('Error handling downgrade:', error);
      // Log to error tracking service
    }
  }

  /**
   * Archive or clean up premium data when downgrading
   */
  private static async archivePremiumData(userId: string) {
    try {
      const { error } = await (supabase as any)
        .from('maintenance_requests')
        .update({ status: 'archived' })
        .eq('user_id', userId)
        .eq('is_premium_feature', true);

      if (error) throw error;

    } catch (error) {
      console.error('Error archiving premium data:', error);
      throw error;
    }
  }

  /**
   * Check if a user has access to a specific feature
   */
  static async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    try {
      // Get user's subscription
      const { data: subscription, error } = await (supabase as any)
        .from('billing_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !subscription) return false;

      // Check if subscription is active
      if (!this.isSubscriptionActive(subscription as any)) {
        return false;
      }

      // Get the effective plan
      const plan = this.getEffectivePlan(subscription as any);

      // Define feature access based on plan
      const featureAccess: Record<string, string[]> = {
        free: ['basic_viewing', 'property_search', 'basic_messaging'],
        pro: ['advanced_messaging', 'lease_management', 'document_storage', 'property_inspections'],
        premium: ['maintenance_requests', 'priority_support', 'advanced_analytics']
      };

      // Check if the feature is available in the user's plan
      return featureAccess[plan]?.includes(feature) || false;

    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }
}

// Export a hook for React components
export function useSubscriptionService() {
  const navigate = useNavigate();

  const checkAccess = async (feature: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return false;
    }

    const hasAccess = await SubscriptionService.checkFeatureAccess(user.id, feature);
    
    if (!hasAccess) {
      toast({
        title: "Upgrade Required",
        description: "This feature requires a premium subscription. Click to upgrade.",
        variant: "default",
      });
      
      // Navigate after a brief delay
      setTimeout(() => navigate('/pricing'), 2000);
    }
    
    return hasAccess;
  };

  return {
    checkAccess,
    isSubscriptionActive: SubscriptionService.isSubscriptionActive,
    isInTrial: SubscriptionService.isInTrial,
    getEffectivePlan: SubscriptionService.getEffectivePlan,
    handleSubscriptionStatusChange: SubscriptionService.handleSubscriptionStatusChange,
    handleDowngrade: SubscriptionService.handleDowngrade,
  };
}

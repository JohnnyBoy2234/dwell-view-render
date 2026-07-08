// Client-side mirror of the SQL entitlement logic in is_active_subscriber().
// Keep the two in lockstep: same status set, same expiry rule.
// Note: profiles.plan_status has DB default 'inactive'; treating a null/missing
// status as active only applies to client-side objects that omit the field.

export type NormalizedPlan = 'free' | 'subscriber';

export const SUBSCRIPTION_PRICE_CENTS = 14900; // R149/month
export const LISTING_FEE_CENTS = 9900; // R99 once-off per listing

const SUBSCRIBER_PLANS = new Set(['subscriber', 'pro', 'premium']);
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due', 'non-renewing']);

export function normalizePlan(plan: string | null | undefined): NormalizedPlan {
  return plan && SUBSCRIBER_PLANS.has(plan.toLowerCase()) ? 'subscriber' : 'free';
}

export interface PlanState {
  plan?: string | null;
  planStatus?: string | null;
  planExpiresAt?: string | Date | null;
}

export function isActiveSubscriber({ plan, planStatus, planExpiresAt }: PlanState): boolean {
  if (normalizePlan(plan) !== 'subscriber') return false;
  const status = (planStatus ?? 'active').toLowerCase();
  if (!ACTIVE_STATUSES.has(status)) return false;
  if (planExpiresAt) {
    const exp = new Date(planExpiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() <= Date.now()) return false;
  }
  return true;
}

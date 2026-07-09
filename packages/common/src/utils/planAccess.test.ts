import { describe, it, expect } from 'vitest';
import { normalizePlan, isActiveSubscriber } from './planAccess';

describe('normalizePlan', () => {
  it('maps legacy pro/premium to subscriber', () => {
    expect(normalizePlan('pro')).toBe('subscriber');
    expect(normalizePlan('premium')).toBe('subscriber');
    expect(normalizePlan('Premium')).toBe('subscriber');
  });
  it('keeps subscriber as subscriber', () => {
    expect(normalizePlan('subscriber')).toBe('subscriber');
  });
  it('maps everything else to free', () => {
    expect(normalizePlan('free')).toBe('free');
    expect(normalizePlan(null)).toBe('free');
    expect(normalizePlan(undefined)).toBe('free');
    expect(normalizePlan('basic')).toBe('free');
  });
});

describe('isActiveSubscriber', () => {
  it('is false for free plans regardless of status', () => {
    expect(isActiveSubscriber({ plan: 'free', planStatus: 'active' })).toBe(false);
  });
  it('is true for subscriber with active-ish statuses', () => {
    for (const s of ['active', 'trialing', 'past_due', 'non-renewing']) {
      expect(isActiveSubscriber({ plan: 'subscriber', planStatus: s })).toBe(true);
    }
  });
  it('treats missing status as active', () => {
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: null })).toBe(true);
  });
  it('is false for cancelled/lapsed statuses', () => {
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'cancelled' })).toBe(false);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'lapsed' })).toBe(false);
  });
  it('is false when expiry is in the past, true when in the future or null', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: past })).toBe(false);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: future })).toBe(true);
    expect(isActiveSubscriber({ plan: 'subscriber', planStatus: 'active', planExpiresAt: null })).toBe(true);
  });
  it('accepts legacy pro/premium as subscriber', () => {
    expect(isActiveSubscriber({ plan: 'premium', planStatus: 'active' })).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { currentBillingPeriod, isInBillingWindow } from './billingCycle';

describe('currentBillingPeriod', () => {
  it('formats the period as YYYY-MM', () => {
    expect(currentBillingPeriod(new Date('2026-07-15'))).toBe('2026-07');
  });
});

describe('isInBillingWindow', () => {
  // Window opens 2 days before the last day of the month, stays open to month end.
  it('is false mid-month', () => {
    expect(isInBillingWindow(new Date('2026-07-15'))).toBe(false);
  });
  it('opens exactly 2 days before month-end (31-day month)', () => {
    expect(isInBillingWindow(new Date('2026-07-28'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-07-29'))).toBe(true);
    expect(isInBillingWindow(new Date('2026-07-31'))).toBe(true);
  });
  it('handles 30-day months', () => {
    expect(isInBillingWindow(new Date('2026-06-27'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-06-28'))).toBe(true);
  });
  it('handles February (non-leap)', () => {
    expect(isInBillingWindow(new Date('2026-02-25'))).toBe(false);
    expect(isInBillingWindow(new Date('2026-02-26'))).toBe(true);
  });
  it('handles February (leap year)', () => {
    expect(isInBillingWindow(new Date('2028-02-26'))).toBe(false);
    expect(isInBillingWindow(new Date('2028-02-27'))).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { currentBillingPeriod, isInBillingWindow } from './billingCycle';

describe('currentBillingPeriod', () => {
  it('formats the period as YYYY-MM', () => {
    expect(currentBillingPeriod(new Date(2026, 6, 15))).toBe('2026-07');
  });
});

describe('isInBillingWindow', () => {
  // Window opens 2 days before the last day of the month, stays open to month end.
  it('is false mid-month', () => {
    expect(isInBillingWindow(new Date(2026, 6, 15))).toBe(false);
  });
  it('opens exactly 2 days before month-end (31-day month)', () => {
    expect(isInBillingWindow(new Date(2026, 6, 28))).toBe(false);
    expect(isInBillingWindow(new Date(2026, 6, 29))).toBe(true);
    expect(isInBillingWindow(new Date(2026, 6, 31))).toBe(true);
  });
  it('handles 30-day months', () => {
    expect(isInBillingWindow(new Date(2026, 5, 27))).toBe(false);
    expect(isInBillingWindow(new Date(2026, 5, 28))).toBe(true);
  });
  it('handles February (non-leap)', () => {
    expect(isInBillingWindow(new Date(2026, 1, 25))).toBe(false);
    expect(isInBillingWindow(new Date(2026, 1, 26))).toBe(true);
  });
  it('handles February (leap year)', () => {
    expect(isInBillingWindow(new Date(2028, 1, 26))).toBe(false);
    expect(isInBillingWindow(new Date(2028, 1, 27))).toBe(true);
  });
});

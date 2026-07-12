import { describe, expect, it } from 'vitest';
import { deriveResumeStep, isIncompleteDraft, nextRetryDelay } from './draftLogic';

const completeRow = {
  property_type: 'House',
  suburb: 'Sandton',
  city: 'Johannesburg',
  province: 'Gauteng',
  postal_code: '2196',
  description: 'a'.repeat(60),
  bathrooms: 2,
  price: 15000,
  images: ['u1', 'u2', 'u3', 'u4', 'u5'],
};

describe('deriveResumeStep', () => {
  it('returns 1 when no property type', () => {
    expect(deriveResumeStep({ ...completeRow, property_type: '' })).toBe(1);
  });
  it('returns 2 when address or description incomplete', () => {
    expect(deriveResumeStep({ ...completeRow, province: null })).toBe(2);
    expect(deriveResumeStep({ ...completeRow, description: 'too short' })).toBe(2);
  });
  it('returns 3 when bathrooms not set', () => {
    expect(deriveResumeStep({ ...completeRow, bathrooms: 0 })).toBe(3);
  });
  it('returns 4 when price not set', () => {
    expect(deriveResumeStep({ ...completeRow, price: 0 })).toBe(4);
  });
  it('returns 5 when fewer than 5 photos', () => {
    expect(deriveResumeStep({ ...completeRow, images: ['u1'] })).toBe(5);
  });
  it('returns 6 when everything is complete', () => {
    expect(deriveResumeStep(completeRow)).toBe(6);
  });
});

describe('isIncompleteDraft', () => {
  it('is true for any row that resumes before review', () => {
    expect(isIncompleteDraft({ ...completeRow, price: 0 })).toBe(true);
  });
  it('is false for a complete (e.g. paywalled) unlisted row', () => {
    expect(isIncompleteDraft(completeRow)).toBe(false);
  });
});

describe('nextRetryDelay', () => {
  it('backs off exponentially and caps at 30s', () => {
    expect(nextRetryDelay(1)).toBe(2000);
    expect(nextRetryDelay(2)).toBe(4000);
    expect(nextRetryDelay(3)).toBe(8000);
    expect(nextRetryDelay(10)).toBe(30000);
  });
});

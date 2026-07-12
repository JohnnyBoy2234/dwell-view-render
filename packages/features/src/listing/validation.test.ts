import { describe, expect, it } from 'vitest';
import {
  SA_PROVINCES,
  PRICE_MIN,
  PRICE_MAX,
  MIN_PHOTOS,
  RECOMMENDED_PHOTOS,
  DESCRIPTION_MIN,
  priceWarning,
  needsBathroomConfirm,
  isValidPostalCode,
  isValidSaPhone,
  descriptionWarning,
  composeLocation,
  buildPublishChecklist,
} from './validation';

describe('constants', () => {
  it('lists the 9 SA provinces', () => {
    expect(SA_PROVINCES).toHaveLength(9);
    expect(SA_PROVINCES).toContain('Gauteng');
    expect(SA_PROVINCES).toContain('KwaZulu-Natal');
  });
  it('has sane bounds', () => {
    expect(PRICE_MIN).toBe(500);
    expect(PRICE_MAX).toBe(500000);
    expect(MIN_PHOTOS).toBe(5);
    expect(RECOMMENDED_PHOTOS).toBe(10);
    expect(DESCRIPTION_MIN).toBe(50);
  });
});

describe('priceWarning', () => {
  it('warns on unusually low rent', () => {
    expect(priceWarning(1500)).toMatch(/unusually low/i);
  });
  it('warns on unusually high rent', () => {
    expect(priceWarning(80000)).toMatch(/unusually high/i);
  });
  it('is silent in the normal range', () => {
    expect(priceWarning(12000)).toBeNull();
  });
  it('is silent when empty', () => {
    expect(priceWarning(undefined)).toBeNull();
    expect(priceWarning(0)).toBeNull();
  });
});

describe('needsBathroomConfirm', () => {
  it('flags bathrooms more than bedrooms + 2', () => {
    expect(needsBathroomConfirm(2, 5)).toBe(true);
  });
  it('accepts bathrooms up to bedrooms + 2', () => {
    expect(needsBathroomConfirm(2, 4)).toBe(false);
    expect(needsBathroomConfirm(0, 2)).toBe(false);
  });
  it('is silent when either value is missing', () => {
    expect(needsBathroomConfirm(undefined, 3)).toBe(false);
    expect(needsBathroomConfirm(2, undefined)).toBe(false);
  });
});

describe('isValidPostalCode', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPostalCode('0181')).toBe(true);
  });
  it('rejects everything else', () => {
    expect(isValidPostalCode('181')).toBe(false);
    expect(isValidPostalCode('01810')).toBe(false);
    expect(isValidPostalCode('ABCD')).toBe(false);
    expect(isValidPostalCode('')).toBe(false);
  });
});

describe('isValidSaPhone', () => {
  it('accepts 0XXXXXXXXX and +27XXXXXXXXX', () => {
    expect(isValidSaPhone('0821234567')).toBe(true);
    expect(isValidSaPhone('+27821234567')).toBe(true);
    expect(isValidSaPhone('082 123 4567')).toBe(true); // spaces stripped
  });
  it('rejects wrong lengths and prefixes', () => {
    expect(isValidSaPhone('082123456')).toBe(false);
    expect(isValidSaPhone('1234567890')).toBe(false);
    expect(isValidSaPhone('')).toBe(false);
  });
});

describe('descriptionWarning', () => {
  it('warns under 150 chars', () => {
    expect(descriptionWarning('a'.repeat(60))).toMatch(/fewer enquiries/i);
  });
  it('is silent at 150+', () => {
    expect(descriptionWarning('a'.repeat(150))).toBeNull();
  });
});

describe('composeLocation', () => {
  it('joins suburb, city, province', () => {
    expect(composeLocation({ suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng' }))
      .toBe('Sandton, Johannesburg, Gauteng');
  });
  it('skips missing parts', () => {
    expect(composeLocation({ suburb: '', city: 'Cape Town', province: 'Western Cape' }))
      .toBe('Cape Town, Western Cape');
  });
});

describe('buildPublishChecklist', () => {
  const complete = {
    property_type: 'House',
    suburb: 'Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    postal_code: '2196',
    description: 'a'.repeat(200),
    bedrooms: 3,
    bathrooms: 2,
    parking_spaces: 2,
    amenities: ['Garden'],
    price: 15000,
    images: ['u1', 'u2', 'u3', 'u4', 'u5'],
  } as any;

  it('passes a complete listing with a phone on file', () => {
    const r = buildPublishChecklist(complete, '0821234567');
    expect(r.blockers).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });
  it('blocks under 5 photos', () => {
    const r = buildPublishChecklist({ ...complete, images: ['u1'] }, '0821234567');
    expect(r.blockers.some((b) => /photo/i.test(b))).toBe(true);
  });
  it('blocks missing address fields', () => {
    const r = buildPublishChecklist({ ...complete, province: '' }, '0821234567');
    expect(r.blockers.some((b) => /address/i.test(b))).toBe(true);
  });
  it('blocks a missing profile phone', () => {
    const r = buildPublishChecklist(complete, null);
    expect(r.blockers.some((b) => /phone/i.test(b))).toBe(true);
  });
  it('warns on short description, no parking info, no amenities', () => {
    const r = buildPublishChecklist(
      { ...complete, description: 'a'.repeat(60), parking_spaces: 0, amenities: [] },
      '0821234567'
    );
    expect(r.warnings.some((w) => /description/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /parking/i.test(w))).toBe(true);
    expect(r.warnings.some((w) => /amenities/i.test(w))).toBe(true);
  });
});

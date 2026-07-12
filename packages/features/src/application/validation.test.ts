import { describe, expect, it } from 'vitest';
import { emptyFormData, mergeDraft } from './types';
import { validateSection } from './validation';
import { completionPercentage } from './services/draftService';

const filled = () => {
  const d = emptyFormData();
  d.personal = { first_name: 'Sarah', middle_name: '', last_name: 'Nkosi', phone: '0821234567', email: 'sarah@example.com' };
  d.identity = { ...d.identity, id_number: '8001015009087', date_of_birth: '1980-01-01' };
  d.address = {
    ...d.address,
    line1: '1 Main Rd', suburb: 'Claremont', city: 'Cape Town', province: 'Western Cape',
    postal_code: '7708', years_at_address: '2 years', residential_status: 'renting'
  };
  d.credit.consent = true;
  d.employment = { ...d.employment, status: 'employed', employer_name: 'Acme', job_title: 'Dev', net_monthly_income: '30000' };
  return d;
};

describe('validateSection', () => {
  it('passes a completed personal/identity/address/credit/employment form', () => {
    const d = filled();
    for (const section of ['personal', 'identity', 'address', 'credit', 'employment'] as const) {
      expect(validateSection(section, d)).toEqual({});
    }
  });

  it('rejects an invalid SA ID number', () => {
    const d = filled();
    d.identity.id_number = '1234567890123';
    expect(validateSection('identity', d)).toHaveProperty('id_number');
  });

  it('does not validate a passport number as an SA ID, but requires its expiry', () => {
    const d = filled();
    d.identity.id_type = 'passport';
    d.identity.id_number = 'A1234567';
    expect(validateSection('identity', d)).toHaveProperty('id_expiry_date');
    d.identity.id_expiry_date = '2030-01-01';
    expect(validateSection('identity', d)).toEqual({});
  });

  it('requires consent on the credit step', () => {
    const d = filled();
    d.credit.consent = false;
    expect(validateSection('credit', d)).toHaveProperty('consent');
  });

  it('switches required employment fields with status', () => {
    const d = filled();
    d.employment.status = 'self-employed';
    expect(validateSection('employment', d)).toHaveProperty('business_name');
    d.employment.status = 'student';
    expect(validateSection('employment', d)).toHaveProperty('institution');
    d.employment.status = 'unemployed';
    expect(validateSection('employment', d)).toEqual({});
  });

  it('requires household totals to reconcile', () => {
    const d = filled();
    d.household = { ...d.household, total_occupants: '3', adults: '1', children: '1' };
    expect(validateSection('household', d)).toHaveProperty('total_occupants');
    d.household.children = '2';
    expect(validateSection('household', d)).toEqual({});
  });

  it('requires a pet entry when pets was answered Yes', () => {
    const d = filled();
    d.household.has_pets = true;
    expect(validateSection('household', d)).toHaveProperty('pets');
  });

  it('requires all risk answers, and an explanation for Yes', () => {
    const d = filled();
    const errors = validateSection('risk', d);
    expect(Object.keys(errors)).toHaveLength(5);

    for (const id of ['debt_review', 'prior_eviction', 'outstanding_rent', 'lease_cancelled', 'judgments']) {
      d.risk.answers[id] = { answer: 'no', explanation: '' };
    }
    d.risk.answers.debt_review = { answer: 'yes', explanation: '' };
    expect(validateSection('risk', d)).toEqual({ debt_review_explanation: 'Please provide an explanation' });

    d.risk.answers.debt_review.explanation = 'Entered debt review in 2024, exiting next month.';
    expect(validateSection('risk', d)).toEqual({});
  });
});

describe('mergeDraft', () => {
  it('overlays a saved draft onto the empty shape so new fields keep defaults', () => {
    const merged = mergeDraft({ personal: { first_name: 'Sam' }, household: { adults: '2' } });
    expect(merged.personal.first_name).toBe('Sam');
    expect(merged.personal.last_name).toBe('');
    expect(merged.household.adults).toBe('2');
    expect(merged.identity.id_type).toBe('sa_id');
  });

  it('survives garbage input', () => {
    expect(mergeDraft(null)).toEqual(emptyFormData());
    expect(mergeDraft('nope')).toEqual(emptyFormData());
    expect(mergeDraft({ personal: 42 })).toEqual(emptyFormData());
  });
});

describe('completionPercentage', () => {
  it('maps completed steps onto a percentage of the 8 steps', () => {
    expect(completionPercentage([])).toBe(0);
    expect(completionPercentage([0, 1, 2, 3])).toBe(50);
    expect(completionPercentage([0, 1, 2, 3, 4, 5, 6, 7])).toBe(100);
  });
});

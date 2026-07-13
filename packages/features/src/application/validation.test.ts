import { describe, expect, it } from 'vitest';
import { emptyFormData, mergeDraft, type ApplicationFormData } from './types';
import { validateDocuments, validateSection } from './validation';
import { documentChecklist, creditReportOutdated } from './checklist';
import { summaryGroups } from './summary';
import { completionPercentage } from './services/draftService';

const doc = (type: string) => ({
  name: `${type}.pdf`, path: `u/${type}.pdf`, bucket: 'income-documents', type, uploaded_at: '2026-07-01'
});

const filled = (): ApplicationFormData => {
  const d = emptyFormData();
  d.personal = { first_name: 'Sarah', middle_name: '', last_name: 'Nkosi', phone: '0821234567', email: 'sarah@example.com' };
  d.identity = { ...d.identity, id_number: '8001015009087', date_of_birth: '1980-01-01' };
  d.address = {
    ...d.address,
    line1: '1 Main Rd', suburb: 'Claremont', city: 'Cape Town', province: 'Western Cape',
    postal_code: '7708', years_at_address: '2 years'
  };
  d.credit.consent = 'yes';
  d.employment = { ...d.employment, status: 'employed', employer_name: 'Acme', job_title: 'Dev', net_monthly_income: '30000' };
  d.household = { ...d.household, adults: '2', children: '1', smoking: 'no' };
  d.references = { ...d.references, rented_before: 'no' };
  for (const id of ['debt_review', 'outstanding_rent', 'prior_eviction', 'lease_cancelled']) {
    d.risk.answers[id] = { answer: 'no', explanation: '' };
  }
  return d;
};

describe('validateSection', () => {
  it('passes a completed form on every section', () => {
    const d = filled();
    for (const section of ['personal', 'identity', 'address', 'employment', 'household', 'support', 'references', 'credit', 'risk'] as const) {
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

  it('requires a permit expiry only when a permit type was given', () => {
    const d = filled();
    d.identity.id_type = 'passport';
    d.identity.id_number = 'A1234567';
    d.identity.id_expiry_date = '2030-01-01';
    d.identity.permit_type = 'Work permit';
    expect(validateSection('identity', d)).toHaveProperty('permit_expiry_date');
  });

  it('requires an explicit consent decision — yes or no both pass', () => {
    const d = filled();
    d.credit.consent = '';
    expect(validateSection('credit', d)).toHaveProperty('consent');
    d.credit.consent = 'no';
    expect(validateSection('credit', d)).toEqual({});
  });

  it('switches required employment fields with the income type', () => {
    const d = filled();
    d.employment.status = 'self-employed';
    expect(validateSection('employment', d)).toHaveProperty('work_type');
    expect(validateSection('employment', d)).toHaveProperty('income_frequency');
    d.employment.status = 'informal';
    expect(validateSection('employment', d)).toHaveProperty('work_type');
    d.employment.status = 'student';
    expect(validateSection('employment', d)).toHaveProperty('institution');
    d.employment.status = 'other';
    expect(validateSection('employment', d)).toHaveProperty('payment_source');
  });

  it('lets an informal earner pass with work type, income and frequency', () => {
    const d = filled();
    d.employment = { ...d.employment, status: 'informal', work_type: 'Street trading', income_frequency: 'weekly' };
    expect(validateSection('employment', d)).toEqual({});
  });

  it('requires the smoking answer and a pet entry when pets was answered Yes', () => {
    const d = filled();
    d.household.smoking = '';
    expect(validateSection('household', d)).toHaveProperty('smoking');
    d.household.smoking = 'yes';
    d.household.has_pets = true;
    expect(validateSection('household', d)).toHaveProperty('pets');
  });

  it('only requires guarantor details when a guarantor was selected', () => {
    const d = filled();
    expect(validateSection('support', d)).toEqual({});
    d.support.has_guarantor = 'yes';
    expect(validateSection('support', d)).toHaveProperty('guarantor_name');
    d.support.guarantor_name = 'Thabo M';
    d.support.guarantor_contact = '0831112222';
    expect(validateSection('support', d)).toEqual({});
  });

  it('requires previous-landlord details only for applicants who rented before', () => {
    const d = filled();
    d.references.rented_before = '';
    expect(validateSection('references', d)).toHaveProperty('rented_before');
    d.references.rented_before = 'yes';
    const errors = validateSection('references', d);
    expect(errors).toHaveProperty('landlord_name');
    expect(errors).toHaveProperty('landlord_phone');
    d.references.landlord_name = 'Mrs Adams';
    d.references.landlord_email = 'adams@example.com';
    expect(validateSection('references', d)).toEqual({});
  });

  it('requires every risk answer but never the explanation', () => {
    const d = filled();
    d.risk.answers = {};
    expect(Object.keys(validateSection('risk', d))).toHaveLength(4);
    for (const id of ['debt_review', 'outstanding_rent', 'prior_eviction', 'lease_cancelled']) {
      d.risk.answers[id] = { answer: 'yes', explanation: '' };
    }
    expect(validateSection('risk', d)).toEqual({});
  });
});

describe('documentChecklist', () => {
  it('requires ID, bank statements and payslips for an employed applicant', () => {
    const items = documentChecklist(filled());
    const required = items.filter((i) => i.requirement === 'required').map((i) => i.key);
    expect(required).toEqual(['id', 'bank_statements', 'payslips']);
  });

  it('lets informal earners submit alternative evidence instead of bank statements', () => {
    const d = filled();
    d.employment.status = 'informal';
    const items = documentChecklist(d);
    expect(items.find((i) => i.key === 'bank_statements')?.requirement).toBe('recommended');
    expect(items.find((i) => i.key === 'income_evidence')?.requirement).toBe('required');
  });

  it('offers business evidence to the self-employed and keeps the credit report optional', () => {
    const d = filled();
    d.employment.status = 'self-employed';
    const items = documentChecklist(d);
    expect(items.find((i) => i.key === 'income_evidence')?.label).toBe('Business income evidence');
    expect(items.find((i) => i.key === 'credit_report')?.requirement).toBe('recommended');
  });

  it('blocks submission only on missing required documents', () => {
    const d = filled();
    expect(Object.keys(validateDocuments(d)).sort()).toEqual(['doc_bank_statements', 'doc_id', 'doc_payslips']);
    d.identity.document = doc('id');
    d.employment.income_documents = [doc('bank_statement'), doc('payslip')];
    expect(validateDocuments(d)).toEqual({});
  });

  it('flags a credit report older than about three months', () => {
    expect(creditReportOutdated('')).toBe(false);
    expect(creditReportOutdated(new Date().toISOString().slice(0, 10))).toBe(false);
    expect(creditReportOutdated('2020-01-01')).toBe(true);
  });
});

describe('summaryGroups', () => {
  it('marks the guarantor group not applicable when none was chosen', () => {
    const groups = summaryGroups(filled());
    expect(groups.find((g) => g.key === 'guarantor')?.status).toBe('na');
  });

  it('marks complete and missing groups from the same rules as validation', () => {
    const d = filled();
    d.identity.document = doc('id');
    d.employment.income_documents = [doc('bank_statement'), doc('payslip')];
    const groups = summaryGroups(d);
    expect(groups.find((g) => g.key === 'personal')?.status).toBe('complete');
    expect(groups.find((g) => g.key === 'documents')?.status).toBe('complete');

    d.personal.first_name = '';
    d.employment.income_documents = [];
    const bad = summaryGroups(d);
    expect(bad.find((g) => g.key === 'personal')?.status).toBe('missing');
    expect(bad.find((g) => g.key === 'documents')?.status).toBe('missing');
  });

  it('shows the consent decision in plain language', () => {
    const d = filled();
    d.credit.consent = 'no';
    const consent = summaryGroups(d).find((g) => g.key === 'consent');
    expect(consent?.rows[0].value).toBe('Consent not given');
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

  it('upgrades a v2 draft: boolean consent and address-based landlord reference', () => {
    const merged = mergeDraft({
      credit: { consent: true, report_documents: [] },
      address: { line1: '1 Main Rd', previous_landlord_name: 'Mr Botha', previous_landlord_contact: '0219998888' },
      employment: { industry: 'Construction' }
    });
    expect(merged.credit.consent).toBe('yes');
    expect(merged.references.rented_before).toBe('yes');
    expect(merged.references.landlord_name).toBe('Mr Botha');
    expect(merged.references.landlord_phone).toBe('0219998888');
    expect(merged.employment.work_type).toBe('Construction');
  });

  it('never carries over a declined or unset v2 consent as given', () => {
    expect(mergeDraft({ credit: { consent: false } }).credit.consent).toBe('');
  });

  it('survives garbage input', () => {
    expect(mergeDraft(null)).toEqual(emptyFormData());
    expect(mergeDraft('nope')).toEqual(emptyFormData());
    expect(mergeDraft({ personal: 42 })).toEqual(emptyFormData());
  });
});

describe('completionPercentage', () => {
  it('maps completed steps onto a percentage of the 6 steps', () => {
    expect(completionPercentage([])).toBe(0);
    expect(completionPercentage([0, 1, 2])).toBe(50);
    expect(completionPercentage([0, 1, 2, 3, 4, 5])).toBe(100);
  });
});

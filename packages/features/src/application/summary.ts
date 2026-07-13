import {
  employmentStatusLabel,
  INCOME_FREQUENCY_OPTIONS,
  riskQuestionText
} from '@mzanzihomes/common/constants/applicationConstants';
import { documentChecklist } from './checklist';
import type { ApplicationFormData } from './types';
import { validateSection, validateDocuments } from './validation';

export type GroupStatus = 'complete' | 'missing' | 'na';

export interface SummaryRow {
  label: string;
  value: string;
}

export interface SummaryGroup {
  key: string;
  title: string;
  /** Wizard step index the Edit action jumps to. */
  step: number;
  status: GroupStatus;
  rows: SummaryRow[];
}

const yn = (v: string) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '');

const row = (label: string, value: string | null | undefined): SummaryRow[] =>
  value && value.trim() ? [{ label, value }] : [];

/**
 * The review-screen (and landlord-review) summary model: one card per group,
 * each with a completion status and plain-language rows. Pure so it can render
 * both live form data and stored submission snapshots.
 */
export function summaryGroups(data: ApplicationFormData): SummaryGroup[] {
  const householdErrors = validateSection('household', data);
  const petErrorKeys = Object.keys(householdErrors).filter(
    (k) => k === 'pets' || k === 'smoking' || k.startsWith('pet_')
  );
  const occupancyMissing = Object.keys(householdErrors).some((k) => k === 'adults' || k === 'children');

  const detailsMissing =
    Object.keys(validateSection('personal', data)).length > 0 ||
    Object.keys(validateSection('identity', data)).length > 0 ||
    Object.keys(validateSection('address', data)).length > 0;

  const e = data.employment;
  const frequency = INCOME_FREQUENCY_OPTIONS.find((o) => o.value === e.income_frequency)?.label;
  const r = data.references;

  const address = [
    data.address.line1, data.address.line2, data.address.suburb, data.address.city,
    data.address.province, data.address.postal_code, data.address.country
  ].filter(Boolean).join(', ');

  const groups: SummaryGroup[] = [
    {
      key: 'household',
      title: 'Household',
      step: 2,
      status: occupancyMissing ? 'missing' : 'complete',
      rows: [
        ...row('Adults', data.household.adults),
        ...row('Children / dependants', data.household.children)
      ]
    },
    {
      key: 'personal',
      title: 'Personal details',
      step: 1,
      status: detailsMissing ? 'missing' : 'complete',
      rows: [
        ...row('Name', [data.personal.first_name, data.personal.middle_name, data.personal.last_name].filter(Boolean).join(' ')),
        ...row('Document', data.identity.id_type === 'sa_id' ? 'South African ID' : 'Passport'),
        ...row(data.identity.id_type === 'sa_id' ? 'ID number' : 'Passport number', data.identity.id_number),
        ...row('Date of birth', data.identity.date_of_birth),
        ...row('Citizenship', data.identity.nationality),
        ...row('Permit', data.identity.permit_type),
        ...row('Permit expiry', data.identity.permit_expiry_date),
        ...row('Mobile', data.personal.phone),
        ...row('Email', data.personal.email),
        ...row('Current address', address),
        ...row('Time at address', data.address.years_at_address)
      ]
    },
    {
      key: 'employment',
      title: 'Employment and income',
      step: 2,
      status: Object.keys(validateSection('employment', data)).length > 0 ? 'missing' : 'complete',
      rows: [
        ...row('Income type', e.status ? employmentStatusLabel(e.status) : ''),
        ...row('Employer', e.employer_name),
        ...row('Job title', e.job_title),
        ...row('Started', e.start_date),
        ...row('Employer contact', e.employer_contact),
        ...row('Commission / variable pay', yn(e.has_commission)),
        ...row('Type of work', e.work_type),
        ...row('Business name', e.business_name),
        ...row('Doing this work for', e.years_self_employed),
        ...row('Income received', frequency),
        ...row('Income varies', yn(e.income_varies)),
        ...row('Seasonal income', e.seasonal_notes),
        ...row('Institution', e.institution),
        ...row('Course', e.course),
        ...row('Rent paid by', e.payment_source),
        ...row('Sponsor', e.sponsor_details),
        ...row('Gross monthly income', e.gross_monthly_income && `R ${e.gross_monthly_income}`),
        ...row('Net monthly income', e.net_monthly_income && `R ${e.net_monthly_income}`)
      ]
    },
    {
      key: 'guarantor',
      title: 'Guarantor',
      step: 2,
      status:
        data.support.has_guarantor !== 'yes'
          ? 'na'
          : Object.keys(validateSection('support', data)).length > 0
            ? 'missing'
            : 'complete',
      rows:
        data.support.has_guarantor === 'yes'
          ? [
              ...row('Name', data.support.guarantor_name),
              ...row('Relationship', data.support.guarantor_relationship),
              ...row('Contact', data.support.guarantor_contact)
            ]
          : []
    },
    {
      key: 'pets_smoking',
      title: 'Pets and smoking',
      step: 2,
      status: petErrorKeys.length > 0 ? 'missing' : 'complete',
      rows: [
        {
          label: 'Pets',
          value: data.household.has_pets
            ? data.household.pets
                .map((p) => [p.count > 1 ? `${p.count}×` : '', p.type, p.breed, p.size].filter(Boolean).join(' '))
                .join('; ') || 'Yes'
            : 'None'
        },
        ...row('Smoking', yn(data.household.smoking))
      ]
    },
    {
      key: 'questions',
      title: 'Additional questions',
      step: 2,
      status: Object.keys(validateSection('risk', data)).length > 0 ? 'missing' : 'complete',
      rows: [
        ...Object.entries(data.risk.answers)
          .filter(([, a]) => a?.answer)
          .map(([id, a]) => ({
            label: riskQuestionText(id),
            value: a.answer === 'yes' ? `Yes${a.explanation ? ` — ${a.explanation}` : ''}` : 'No'
          })),
        ...row('Note to the landlord', data.risk.open_note)
      ]
    },
    {
      key: 'consent',
      title: 'Consent',
      step: 3,
      status: Object.keys(validateSection('credit', data)).length > 0 ? 'missing' : 'complete',
      rows: [
        {
          label: 'Screening checks',
          value:
            data.credit.consent === 'yes'
              ? 'Consent given'
              : data.credit.consent === 'no'
                ? 'Consent not given'
                : 'Not decided yet'
        }
      ]
    },
    {
      key: 'references',
      title: 'References',
      step: 4,
      status: Object.keys(validateSection('references', data)).length > 0 ? 'missing' : 'complete',
      rows: [
        ...row('Rented before', yn(r.rented_before)),
        ...row('Previous landlord / agent', r.landlord_name),
        ...row('Their phone', r.landlord_phone),
        ...row('Their email', r.landlord_email),
        ...row('Previous rental address', r.previous_address),
        ...(r.rented_before === 'yes'
          ? row('May be contacted', r.may_contact ? 'Yes' : 'No')
          : []),
        ...row('Income reference', [r.income_ref_name, r.income_ref_role].filter(Boolean).join(' — ')),
        ...row('Income reference contact', r.income_ref_contact)
      ]
    },
    {
      key: 'documents',
      title: 'Documents',
      step: 4,
      status: Object.keys(validateDocuments(data)).length > 0 ? 'missing' : 'complete',
      rows: documentChecklist(data).map((item) => ({
        label: item.label,
        value: item.docs.length > 0
          ? item.docs.map((d) => d.name).join(', ')
          : item.requirement === 'required'
            ? 'Missing'
            : 'Not uploaded'
      }))
    }
  ];

  return groups;
}

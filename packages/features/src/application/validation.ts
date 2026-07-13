import { isValidSaId } from '@mzanzihomes/common/utils/saId';
import { EMPLOYED_STATUSES, RISK_QUESTIONS } from '@mzanzihomes/common/constants/applicationConstants';
import { missingRequiredDocuments } from './checklist';
import type { ApplicationFormData, SectionKey } from './types';

export type FieldErrors = Record<string, string>;

const required = (errors: FieldErrors, value: string, field: string, label: string) => {
  if (!value || !value.trim()) errors[field] = `${label} is required`;
};

export function validateSection(section: SectionKey, data: ApplicationFormData): FieldErrors {
  const errors: FieldErrors = {};

  switch (section) {
    case 'personal': {
      const p = data.personal;
      required(errors, p.first_name, 'first_name', 'First name');
      required(errors, p.last_name, 'last_name', 'Last name');
      required(errors, p.phone, 'phone', 'Mobile number');
      if (p.phone && !/^\+?[0-9 ()-]{9,15}$/.test(p.phone.trim())) {
        errors.phone = 'Enter a valid phone number';
      }
      required(errors, p.email, 'email', 'Email address');
      if (p.email && !/^\S+@\S+\.\S+$/.test(p.email.trim())) {
        errors.email = 'Enter a valid email address';
      }
      break;
    }

    case 'identity': {
      const i = data.identity;
      required(errors, i.id_number, 'id_number', 'ID or passport number');
      if (i.id_type === 'sa_id' && i.id_number && !isValidSaId(i.id_number.trim())) {
        errors.id_number = 'Enter a valid 13-digit South African ID number';
      }
      if (i.id_type === 'passport') {
        required(errors, i.id_expiry_date, 'id_expiry_date', 'Passport expiry date');
        if (i.permit_type) {
          required(errors, i.permit_expiry_date, 'permit_expiry_date', 'Permit expiry date');
        }
      }
      required(errors, i.date_of_birth, 'date_of_birth', 'Date of birth');
      required(errors, i.nationality, 'nationality', 'Citizenship');
      break;
    }

    case 'address': {
      const a = data.address;
      required(errors, a.line1, 'line1', 'Street address');
      required(errors, a.suburb, 'suburb', 'Suburb');
      required(errors, a.city, 'city', 'City or town');
      required(errors, a.province, 'province', 'Province');
      required(errors, a.postal_code, 'postal_code', 'Postal code');
      required(errors, a.country, 'country', 'Country');
      required(errors, a.years_at_address, 'years_at_address', 'Time at this address');
      break;
    }

    case 'employment': {
      const e = data.employment;
      required(errors, e.status, 'status', 'Employment or income type');
      if ((EMPLOYED_STATUSES as readonly string[]).includes(e.status)) {
        required(errors, e.employer_name, 'employer_name', 'Employer name');
        required(errors, e.job_title, 'job_title', 'Job title');
        required(errors, e.net_monthly_income, 'net_monthly_income', 'Monthly net income');
      } else if (e.status === 'self-employed' || e.status === 'informal') {
        required(errors, e.work_type, 'work_type', 'Type of work or business');
        required(errors, e.net_monthly_income, 'net_monthly_income', 'Average monthly income');
        required(errors, e.income_frequency, 'income_frequency', 'How often income is received');
      } else if (e.status === 'student') {
        required(errors, e.institution, 'institution', 'Institution name');
        required(errors, e.payment_source, 'payment_source', 'Source of rental payment');
      } else if (e.status === 'other') {
        required(errors, e.payment_source, 'payment_source', 'How the rent will be paid');
      }
      for (const field of ['gross_monthly_income', 'net_monthly_income'] as const) {
        const v = e[field];
        if (v && (isNaN(Number(v)) || Number(v) < 0)) {
          errors[field] = 'Enter a valid amount';
        }
      }
      break;
    }

    case 'household': {
      const h = data.household;
      const adults = Number(h.adults);
      const children = Number(h.children);
      if (!h.adults || isNaN(adults) || adults < 1) {
        errors.adults = 'At least one adult occupant is required';
      }
      if (h.children === '' || isNaN(children) || children < 0) {
        errors.children = 'Enter the number of children or dependants';
      }
      if (h.has_pets && h.pets.length === 0) {
        errors.pets = 'Add at least one pet, or select No';
      }
      h.pets.forEach((pet, idx) => {
        if (!pet.type.trim()) errors[`pet_${idx}_type`] = 'Type of animal is required';
      });
      if (h.smoking !== 'yes' && h.smoking !== 'no') {
        errors.smoking = 'Please answer the smoking question';
      }
      break;
    }

    case 'support': {
      const s = data.support;
      if (s.has_guarantor === 'yes') {
        required(errors, s.guarantor_name, 'guarantor_name', "Guarantor's name");
        required(errors, s.guarantor_contact, 'guarantor_contact', "Guarantor's contact details");
      }
      break;
    }

    case 'references': {
      const r = data.references;
      if (r.rented_before !== 'yes' && r.rented_before !== 'no') {
        errors.rented_before = 'Please tell us whether you have rented before';
      }
      if (r.rented_before === 'yes') {
        required(errors, r.landlord_name, 'landlord_name', 'Previous landlord or agent name');
        if (!r.landlord_phone.trim() && !r.landlord_email.trim()) {
          errors.landlord_phone = 'Provide a mobile number or email address for the reference';
        }
      }
      break;
    }

    case 'credit': {
      if (data.credit.consent !== 'yes' && data.credit.consent !== 'no') {
        errors.consent = 'Please choose whether to give consent before continuing';
      }
      break;
    }

    case 'risk': {
      for (const q of RISK_QUESTIONS) {
        const a = data.risk.answers[q.id];
        if (!a || (a.answer !== 'yes' && a.answer !== 'no')) {
          errors[q.id] = 'Please answer this question';
        }
      }
      break;
    }
  }

  return errors;
}

/** Required document checklist items that would block submission. */
export function validateDocuments(data: ApplicationFormData): FieldErrors {
  const errors: FieldErrors = {};
  for (const item of missingRequiredDocuments(data)) {
    errors[`doc_${item.key}`] = `${item.label} is required`;
  }
  return errors;
}

export const isSectionValid = (section: SectionKey, data: ApplicationFormData): boolean =>
  Object.keys(validateSection(section, data)).length === 0;

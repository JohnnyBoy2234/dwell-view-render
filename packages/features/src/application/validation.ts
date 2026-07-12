import { isValidSaId } from '@mzanzihomes/common/utils/saId';
import { EMPLOYED_STATUSES, RISK_QUESTIONS } from '@mzanzihomes/common/constants/applicationConstants';
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
      required(errors, p.phone, 'phone', 'Phone number');
      if (p.phone && !/^\+?[0-9 ()-]{9,15}$/.test(p.phone.trim())) {
        errors.phone = 'Enter a valid phone number';
      }
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
      }
      required(errors, i.date_of_birth, 'date_of_birth', 'Date of birth');
      required(errors, i.nationality, 'nationality', 'Nationality');
      break;
    }

    case 'address': {
      const a = data.address;
      required(errors, a.line1, 'line1', 'Address line 1');
      required(errors, a.suburb, 'suburb', 'Suburb');
      required(errors, a.city, 'city', 'City or town');
      required(errors, a.province, 'province', 'Province');
      required(errors, a.postal_code, 'postal_code', 'Postal code');
      required(errors, a.country, 'country', 'Country');
      required(errors, a.years_at_address, 'years_at_address', 'Time at address');
      required(errors, a.residential_status, 'residential_status', 'Residential status');
      break;
    }

    case 'credit': {
      if (!data.credit.consent) {
        errors.consent = 'You must provide credit-check consent to continue';
      }
      break;
    }

    case 'employment': {
      const e = data.employment;
      required(errors, e.status, 'status', 'Employment status');
      if ((EMPLOYED_STATUSES as readonly string[]).includes(e.status)) {
        required(errors, e.employer_name, 'employer_name', 'Employer name');
        required(errors, e.job_title, 'job_title', 'Job title');
        required(errors, e.net_monthly_income, 'net_monthly_income', 'Monthly net income');
      } else if (e.status === 'self-employed') {
        required(errors, e.business_name, 'business_name', 'Business or trading name');
        required(errors, e.net_monthly_income, 'net_monthly_income', 'Average monthly income');
      } else if (e.status === 'student') {
        required(errors, e.institution, 'institution', 'Institution name');
        required(errors, e.payment_source, 'payment_source', 'Source of rental payment');
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
      const total = Number(h.total_occupants);
      const adults = Number(h.adults);
      const children = Number(h.children);
      if (!h.total_occupants || isNaN(total) || total < 1) {
        errors.total_occupants = 'Enter the total number of occupants';
      }
      if (isNaN(adults) || adults < 1) {
        errors.adults = 'At least one adult occupant is required';
      }
      if (isNaN(children) || children < 0) {
        errors.children = 'Enter the number of children';
      }
      if (!errors.total_occupants && !errors.adults && !errors.children && adults + children !== total) {
        errors.total_occupants = 'Adults plus children must equal the total number of occupants';
      }
      if (h.has_pets && h.pets.length === 0) {
        errors.pets = 'Add at least one pet, or select No';
      }
      h.pets.forEach((pet, idx) => {
        if (!pet.type.trim()) errors[`pet_${idx}_type`] = 'Type of animal is required';
      });
      break;
    }

    case 'risk': {
      for (const q of RISK_QUESTIONS) {
        const a = data.risk.answers[q.id];
        if (!a || (a.answer !== 'yes' && a.answer !== 'no')) {
          errors[q.id] = 'Please answer this question';
        } else if (a.answer === 'yes' && !a.explanation.trim()) {
          errors[`${q.id}_explanation`] = 'Please provide an explanation';
        }
      }
      break;
    }
  }

  return errors;
}

export const isSectionValid = (section: SectionKey, data: ApplicationFormData): boolean =>
  Object.keys(validateSection(section, data)).length === 0;

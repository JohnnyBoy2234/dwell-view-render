export interface DocRef {
  name: string;
  path: string;
  bucket: string;
  type: string;
  uploaded_at: string;
}

export interface Pet {
  type: string;
  breed: string;
  size: string;
  age: string;
  count: number;
  vaccinated: boolean;
  description: string;
  photo: DocRef | null;
}

export interface Occupant {
  name: string;
  relationship: string;
  is_co_tenant: boolean;
}

export interface RiskAnswer {
  answer: 'yes' | 'no' | '';
  explanation: string;
}

export interface ApplicationFormData {
  personal: {
    first_name: string;
    middle_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
  identity: {
    id_type: 'sa_id' | 'passport';
    id_number: string;
    date_of_birth: string;
    nationality: string;
    id_expiry_date: string;
    document: DocRef | null;
  };
  address: {
    line1: string;
    line2: string;
    suburb: string;
    city: string;
    province: string;
    postal_code: string;
    country: string;
    years_at_address: string;
    residential_status: string;
    reason_for_moving: string;
    previous_landlord_name: string;
    previous_landlord_contact: string;
    proof_document: DocRef | null;
  };
  credit: {
    report_documents: DocRef[];
    consent: boolean;
  };
  employment: {
    status: string;
    employer_name: string;
    job_title: string;
    start_date: string;
    gross_monthly_income: string;
    net_monthly_income: string;
    employer_contact: string;
    business_name: string;
    industry: string;
    years_self_employed: string;
    business_reg_number: string;
    institution: string;
    course: string;
    sponsor_details: string;
    payment_source: string;
    income_documents: DocRef[];
  };
  household: {
    total_occupants: string;
    adults: string;
    children: string;
    occupants: Occupant[];
    child_age_ranges: string[];
    has_pets: boolean;
    pets: Pet[];
  };
  risk: {
    answers: Record<string, RiskAnswer>;
  };
}

export type SectionKey = keyof ApplicationFormData;

export const emptyFormData = (): ApplicationFormData => ({
  personal: { first_name: '', middle_name: '', last_name: '', phone: '', email: '' },
  identity: { id_type: 'sa_id', id_number: '', date_of_birth: '', nationality: 'South African', id_expiry_date: '', document: null },
  address: {
    line1: '', line2: '', suburb: '', city: '', province: '', postal_code: '',
    country: 'South Africa', years_at_address: '', residential_status: '',
    reason_for_moving: '', previous_landlord_name: '', previous_landlord_contact: '',
    proof_document: null
  },
  credit: { report_documents: [], consent: false },
  employment: {
    status: '', employer_name: '', job_title: '', start_date: '',
    gross_monthly_income: '', net_monthly_income: '', employer_contact: '',
    business_name: '', industry: '', years_self_employed: '', business_reg_number: '',
    institution: '', course: '', sponsor_details: '', payment_source: '',
    income_documents: []
  },
  household: {
    total_occupants: '1', adults: '1', children: '0',
    occupants: [], child_age_ranges: [], has_pets: false, pets: []
  },
  risk: { answers: {} }
});

/** Deep-merges a saved draft over the empty shape so new fields added after
 * a draft was saved still exist. */
export const mergeDraft = (saved: unknown): ApplicationFormData => {
  const base = emptyFormData();
  if (!saved || typeof saved !== 'object') return base;
  for (const key of Object.keys(base) as SectionKey[]) {
    const section = (saved as Record<string, unknown>)[key];
    if (section && typeof section === 'object') {
      base[key] = { ...base[key], ...(section as object) } as never;
    }
  }
  return base;
};

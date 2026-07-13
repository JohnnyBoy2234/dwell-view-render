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

export interface RiskAnswer {
  answer: 'yes' | 'no' | '';
  explanation: string;
}

export type YesNo = 'yes' | 'no' | '';

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
    permit_type: string;
    permit_expiry_date: string;
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
    proof_document: DocRef | null;
  };
  employment: {
    status: string;
    employer_name: string;
    job_title: string;
    start_date: string;
    gross_monthly_income: string;
    net_monthly_income: string;
    employer_contact: string;
    has_commission: YesNo;
    business_name: string;
    work_type: string;
    years_self_employed: string;
    income_frequency: string;
    income_varies: YesNo;
    seasonal_notes: string;
    institution: string;
    course: string;
    sponsor_details: string;
    payment_source: string;
    income_documents: DocRef[];
  };
  household: {
    adults: string;
    children: string;
    has_pets: boolean;
    pets: Pet[];
    smoking: YesNo;
  };
  support: {
    has_guarantor: YesNo;
    guarantor_name: string;
    guarantor_relationship: string;
    guarantor_contact: string;
  };
  references: {
    rented_before: YesNo;
    landlord_name: string;
    landlord_phone: string;
    landlord_email: string;
    previous_address: string;
    may_contact: boolean;
    income_ref_name: string;
    income_ref_role: string;
    income_ref_contact: string;
  };
  credit: {
    consent: YesNo;
    report_documents: DocRef[];
    report_date: string;
  };
  risk: {
    answers: Record<string, RiskAnswer>;
    open_note: string;
  };
}

export type SectionKey = keyof ApplicationFormData;

export const emptyFormData = (): ApplicationFormData => ({
  personal: { first_name: '', middle_name: '', last_name: '', phone: '', email: '' },
  identity: {
    id_type: 'sa_id', id_number: '', date_of_birth: '', nationality: 'South African',
    id_expiry_date: '', permit_type: '', permit_expiry_date: '', document: null
  },
  address: {
    line1: '', line2: '', suburb: '', city: '', province: '', postal_code: '',
    country: 'South Africa', years_at_address: '', proof_document: null
  },
  employment: {
    status: '', employer_name: '', job_title: '', start_date: '',
    gross_monthly_income: '', net_monthly_income: '', employer_contact: '',
    has_commission: '', business_name: '', work_type: '', years_self_employed: '',
    income_frequency: '', income_varies: '', seasonal_notes: '',
    institution: '', course: '', sponsor_details: '', payment_source: '',
    income_documents: []
  },
  household: { adults: '1', children: '0', has_pets: false, pets: [], smoking: '' },
  support: { has_guarantor: '', guarantor_name: '', guarantor_relationship: '', guarantor_contact: '' },
  references: {
    rented_before: '', landlord_name: '', landlord_phone: '', landlord_email: '',
    previous_address: '', may_contact: false,
    income_ref_name: '', income_ref_role: '', income_ref_contact: ''
  },
  credit: { consent: '', report_documents: [], report_date: '' },
  risk: { answers: {}, open_note: '' }
});

/** Deep-merges a saved draft over the empty shape so new fields added after
 * a draft was saved still exist, and upgrades drafts saved by the previous
 * eight-step wizard. */
export const mergeDraft = (saved: unknown): ApplicationFormData => {
  const base = emptyFormData();
  if (!saved || typeof saved !== 'object') return base;
  const raw = saved as Record<string, any>;
  for (const key of Object.keys(base) as SectionKey[]) {
    const section = raw[key];
    if (section && typeof section === 'object') {
      base[key] = { ...base[key], ...(section as object) } as never;
    }
  }

  // v2 drafts: consent was a boolean; only an explicit true carries over
  if (typeof raw.credit?.consent === 'boolean') {
    base.credit.consent = raw.credit.consent ? 'yes' : '';
  }
  // v2 drafts kept the previous-landlord reference on the address section
  if (!base.references.landlord_name && raw.address?.previous_landlord_name) {
    base.references.rented_before = 'yes';
    base.references.landlord_name = String(raw.address.previous_landlord_name);
    base.references.landlord_phone = String(raw.address.previous_landlord_contact || '');
  }
  // v2 drafts: self-employed industry → work type
  if (!base.employment.work_type && raw.employment?.industry) {
    base.employment.work_type = String(raw.employment.industry);
  }
  return base;
};

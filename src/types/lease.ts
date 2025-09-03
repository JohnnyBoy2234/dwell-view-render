export type LeaseStatus = 
  | 'DRAFT' 
  | 'PENDING_TENANT_SIGNATURE' 
  | 'PENDING_LANDLORD_SIGNATURE' 
  | 'COMPLETED' 
  | 'CANCELED' 
  | 'CHANGES_REQUESTED';

export type LeaseRole = 'TENANT' | 'LANDLORD';

export type LeaseAction = 
  | 'GENERATED' 
  | 'VIEWED' 
  | 'DOWNLOADED' 
  | 'SIGNED' 
  | 'REQUESTED_CHANGES' 
  | 'CANCELED' 
  | 'REGENERATED';

export interface LeaseData {
  landlord: {
    name: string;
    id_number: string;
    company: string;
    email: string;
    phone: string;
    address: string;
  };
  tenant: {
    name: string;
    id_number: string;
    email: string;
    phone: string;
    current_address: string;
    occupants: Array<{
      name: string;
      relationship: string;
      age: string;
    }>;
  };
  property: {
    address: string;
    unit: string;
    city: string;
    province: string;
    postal_code: string;
    type: 'apartment' | 'house' | 'townhouse';
    parking: 'N/A' | '1 bay' | '2 bays';
  };
  term: {
    start_date: string;
    end_date: string;
    option_to_renew: boolean;
    notice_period_days: number;
  };
  rent: {
    monthly_rent: number;
    due_day: number;
    payment_method: 'EFT' | 'Cash' | 'Cheque';
    late_fee_policy: {
      grace_days: number;
      late_fee_fixed: number;
      late_fee_percent: number;
    };
  };
  deposit: {
    amount: number;
    return_days: number;
  };
  utilities: {
    water: 'tenant' | 'landlord' | 'included';
    electricity: 'tenant' | 'landlord' | 'included';
    internet: 'tenant' | 'landlord' | 'included';
    other: string;
  };
  maintenance: {
    tenant_minor_repairs_cap: number;
    landlord_responsible: string[];
  };
  access: {
    entry_notice_hours: number;
  };
  governing_law: string;
  attachments: {
    move_in_inspection_required: boolean;
    annexures: string[];
  };
  branding: {
    logo_url: string;
    primary_hex: string;
    secondary_hex: string;
    font_family: string;
  };
}

export interface Lease {
  id: string;
  property_id: string;
  landlord_user_id: string;
  tenant_user_id: string | null;
  version: number;
  status: LeaseStatus;
  lease_data: LeaseData;
  pdf_draft_url: string | null;
  pdf_signed_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseSignature {
  id: string;
  lease_id: string;
  role: LeaseRole;
  signer_user_id: string;
  signed_at: string | null;
  signature_image_url: string | null;
  signature_hash: string | null;
  ip_address: string | null;
  user_agent: string | null;
  geo_meta: Record<string, any> | null;
  created_at: string;
}

export interface LeaseAuditLog {
  id: string;
  lease_id: string;
  actor_user_id: string;
  action: LeaseAction;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface LeaseWithSignatures extends Lease {
  signatures: LeaseSignature[];
  audit_logs: LeaseAuditLog[];
}

export interface GenerateLeaseRequest {
  property_id: string;
  tenant_user_id?: string;
  lease_data?: Partial<LeaseData>;
}

export interface SignLeaseRequest {
  lease_id: string;
  role: LeaseRole;
  signature_png_base64: string;
}

export interface RequestChangesRequest {
  lease_id: string;
  reason: string;
}

export interface LeaseStatusInfo {
  status: LeaseStatus;
  label: string;
  color: string;
  description: string;
}

export const LEASE_STATUS_INFO: Record<LeaseStatus, LeaseStatusInfo> = {
  DRAFT: {
    status: 'DRAFT',
    label: 'Draft',
    color: 'gray',
    description: 'Lease generated, awaiting signatures'
  },
  PENDING_TENANT_SIGNATURE: {
    status: 'PENDING_TENANT_SIGNATURE',
    label: 'Awaiting Tenant',
    color: 'amber',
    description: 'Landlord signed, waiting for tenant signature'
  },
  PENDING_LANDLORD_SIGNATURE: {
    status: 'PENDING_LANDLORD_SIGNATURE',
    label: 'Awaiting Landlord',
    color: 'amber',
    description: 'Tenant signed, waiting for landlord signature'
  },
  COMPLETED: {
    status: 'COMPLETED',
    label: 'Completed',
    color: 'green',
    description: 'Both parties have signed the lease'
  },
  CANCELED: {
    status: 'CANCELED',
    label: 'Canceled',
    color: 'red',
    description: 'Lease has been canceled'
  },
  CHANGES_REQUESTED: {
    status: 'CHANGES_REQUESTED',
    label: 'Changes Requested',
    color: 'orange',
    description: 'One party requested changes, new version needed'
  }
};

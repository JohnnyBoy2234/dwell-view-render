export interface LeaseContract {
  id: string;
  property_id?: string;
  landlord_id: string;
  tenant_id?: string;
  title: string;
  contract_data: LeaseContractData;
  status: 'draft' | 'pending_tenant' | 'pending_landlord' | 'signed' | 'expired' | 'terminated';
  version: number;
  pdf_url?: string;
  pdf_hash?: string;
  landlord_signed_at?: string;
  tenant_signed_at?: string;
  landlord_signature_data?: SignatureData;
  tenant_signature_data?: SignatureData;
  audit_trail: AuditTrailEntry[];
  encryption_key_id?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface LeaseContractData {
  // Property Information
  propertyAddress: string;
  propertyType: string;
  propertyDescription?: string;

  // Parties Information  
  landlordName: string;
  landloardIdNumber: string;
  landlordAddress: string;
  landlordEmail: string;
  landlordPhone?: string;
  
  tenantName: string;
  tenantAddress: string;
  tenantIdNumber:string;
  tenantEmail: string;
  tenantPhone?: string;

  // Bank Details
  landlordBranchCode: string;
  landlordBranchName: string;
  landlordAccNumber: string;
  landlordReference?: string;

  // Lease Terms
  leaseStartDate: string;
  leaseEndDate: string;
  rentAmount: number;
  rentCurrency: string;
  rentPaymentFrequency: 'monthly' | 'weekly' | 'quarterly' | 'annually';
  rentDueDay: number;
  
  // Security and Deposits
  securityDeposit?: number;
  petDeposit?: number;
  keyDeposit?: number;
  
  // Utilities and Services
  utilitiesIncluded?: string[];
  utilitiesExcluded?: string[];
  
  // Rules and Restrictions
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  guestsAllowed?: boolean;
  sublettingAllowed?: boolean;
  
  // Additional Terms
  additionalClauses?: ClauseSection[];
  
  // Property Conditions
  furnishedStatus?: 'furnished' | 'unfurnished' | 'semi-furnished';
  parkingSpaces?: number;
  
  // Legal and Compliance
  jurisdiction: string;
  
  // Custom Fields
  customFields?: Record<string, any>;
}

export interface ClauseSection {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  order: number;
}

export interface SignatureData {
  signature_image_url: string;
  signature_hash: string;
  signed_at: string;
  ip_address: string;
  user_agent: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  consent_acknowledged: boolean;
}

export interface AuditTrailEntry {
  timestamp: string;
  action: string;
  actor_id: string;
  details: Record<string, any>;
}

export interface LeaseTemplate {
  id: string;
  landlord_id: string;
  name: string;
  description?: string;
  template_data: LeaseContractData;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignatureAudit {
  id: string;
  lease_contract_id: string;
  signer_id: string;
  signer_role: 'landlord' | 'tenant';
  signature_hash: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  consent_method: string;
  document_hash: string;
  geolocation?: Record<string, any>;
  verification_data: Record<string, any>;
  created_at: string;
}

// Contract builder step types
export interface ContractBuilderStep {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  isCompleted: boolean;
  component: string;
  validation?: (data: LeaseContractData) => string[];
}

// E-signature workflow types
export interface ESignatureSession {
  contract_id: string;
  signer_role: 'landlord' | 'tenant';
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  expires_at: string;
  redirect_url?: string;
}

// PDF generation options
export interface PDFGenerationOptions {
  includeWatermark?: boolean;
  complianceLevel?: 'basic' | 'enhanced' | 'full';
  templateStyle?: 'professional' | 'modern' | 'classic';
}
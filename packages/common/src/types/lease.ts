// South African Residential Lease Types
// These types support the legally-compliant lease generator

// Lease type options
export type LeaseType = 'fixed' | 'month_to_month';

// Who maintains which feature
export type MaintenanceResponsibility = 'tenant' | 'landlord';

// Condition report answer. '' = unanswered (visually distinct from a real
// Yes/No/N/A) — the landlord must actively answer each statement rather than
// silently inheriting a default, which is what the PPA §67 disclosure requires.
export type ConditionAnswer = 'yes' | 'no' | 'na' | '';

// Lease status
export type LeaseStatus = 'draft' | 'pending_tenant' | 'pending_landlord' | 'signed' | 'expired' | 'terminated';

// Condition Report Answers (Annexure A - 29 statements)
export interface ConditionReportAnswers {
  s1_electrical: ConditionAnswer;
  s2_illegalElectrical: ConditionAnswer;
  s3_geyser: ConditionAnswer;
  s4_drainage: ConditionAnswer;
  s5_leakingTaps: ConditionAnswer;
  s6_missingKeys: ConditionAnswer;
  s7_remoteControls: ConditionAnswer;
  s8_alarmSecurity: ConditionAnswer;
  s9_pool: ConditionAnswer;
  s10_poolRepairs: ConditionAnswer;
  s11_braaiFireplace: ConditionAnswer;
  s12_blindsCurtains: ConditionAnswer;
  s13_dampProblems: ConditionAnswer;
  s14_roofLeaks: ConditionAnswer;
  s15_crackedWindows: ConditionAnswer;
  s16_bathsBasins: ConditionAnswer;
  s17_floorTiles: ConditionAnswer;
  s18_structuralDefects: ConditionAnswer;
  s19_carpets: ConditionAnswer;
  s20_builtInCupboards: ConditionAnswer;
  s21_doorHandles: ConditionAnswer;
  s22_boundaryFence: ConditionAnswer;
  s23_buildingRestrictions: ConditionAnswer;
  s24_buildingPlans: ConditionAnswer;
  s25_approvedPlans: ConditionAnswer;
  s26_otherDefects: ConditionAnswer;
  s27_yearsResided: string;
  s28_existingLease: ConditionAnswer;
  s29_limitedKnowledge: ConditionAnswer;
  comments: string; // Legacy single Clause 32 box — superseded by conditionDetails per-item comments, kept for back-compat.
}

// Per-statement Clause 32 detail: the required explanation for any statement
// answered "Yes". Keyed by the sN_ statement key (e.g. "s3_geyser").
export interface ConditionItemDetail {
  comment?: string;
}
export type ConditionDetails = Record<string, ConditionItemDetail>;

// Main wizard data structure - all variables for the template
export interface LeaseWizardData {
  // STEP 1: Lease Basics
  leaseType: LeaseType;
  leaseStartDate: string;
  leaseEndDate?: string; // Only required if fixed-term
  rentAmount: number;
  rentDueDay: number; // 1-7
  escalationPercent?: number;

  // STEP 2: Parties - Landlord
  landlordFullName: string;
  landlordIdNumber: string;
  landlordAddress: string;
  landlordEmail: string;
  landlordPhone?: string;
  
  // STEP 2: Parties - Tenant
  tenantFullName: string;
  tenantIdNumber: string;
  tenantAddress: string;
  tenantEmail: string;
  tenantPhone?: string;
  tenantIsJuristic: boolean;

  // STEP 3: Property Details
  propertyAddress: string;
  isSectionalTitle: boolean;
  bodyCorpRulesApply: boolean;

  // STEP 4: Deposit & Fees
  depositAmount: number;
  lateFeeAmount: number;

  // STEP 5: CPA (Consumer Protection Act)
  tenantIsIndividual: boolean;
  landlordActingInBusiness: boolean;
  cpaApplies: boolean; // Auto-computed: tenantIsIndividual && landlordActingInBusiness

  // STEP 6: Property Features (Clause Toggles)
  hasPool: boolean;
  hasGarden: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  hasAlarmSecurity: boolean;

  // STEP 7: Maintenance Allocation (only shown if feature exists)
  poolMaintenanceBy?: MaintenanceResponsibility;
  gardenMaintenanceBy?: MaintenanceResponsibility;
  alarmMaintenanceBy?: MaintenanceResponsibility;

  // STEP 8: Condition Report (Annexure A)
  conditionReport: ConditionReportAnswers;
  // Per-item Clause 32 explanations + photo evidence for flagged statements.
  conditionDetails?: ConditionDetails;

  // STEP 9: Exclusions
  excludedItemsList: string;

  // Bank Details (for payment schedule + Paystack rent payouts)
  landlordBankName: string;
  landlordBankCode?: string;      // Paystack bank code (used to create the subaccount)
  landlordAccountHolder?: string;
  landlordBranchCode: string;
  landlordAccountNumber: string;
  landlordReference?: string;

  // Occupants
  occupantsList?: string;
}

// Audit trail entry
export interface AuditEntry {
  timestamp: string;
  action: string;
  actorId: string;
  details: Record<string, any>;
}

// Signature data for e-signing (supports both camelCase and snake_case)
export interface SignatureData {
  signature_image_url?: string;
  signatureImageUrl?: string;
  signature_hash?: string;
  signatureHash?: string;
  signed_at?: string;
  signedAt?: string;
  ip_address?: string;
  ipAddress?: string;
  user_agent?: string;
  userAgent?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  consent_acknowledged?: boolean;
  consentAcknowledged?: boolean;
  consent_text?: string;
  consent_version?: string;
}

// E-signature session for managing signing flow
export interface ESignatureSession {
  contract_id: string;
  signer_role: 'landlord' | 'tenant';
  status: 'pending' | 'signed' | 'expired';
  expires_at: string;
}

// Main lease contract entity
export interface LeaseContract {
  id: string;
  propertyId?: string;
  landlordId: string;
  tenantId?: string;
  title: string;
  wizardData: LeaseWizardData;
  status: LeaseStatus;
  version: number;
  templateVersion: number;
  pdfUrl?: string;
  annexurePdfUrl?: string;
  pdfHash?: string;
  landlordSignedAt?: string;
  tenantSignedAt?: string;
  landlordSignatureData?: SignatureData;
  tenantSignatureData?: SignatureData;
  auditTrail: AuditEntry[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Default values for creating a new wizard
// Every statement starts UNANSWERED ('') — not pre-set to "No". The disclosure
// is a legal certification, so the landlord must actively note each response
// (fast path: one "Mark all as No" tap). Non-applicable pool/alarm items are
// defaulted to N/A by the wizard when the property lacks that feature.
export const DEFAULT_CONDITION_REPORT: ConditionReportAnswers = {
  s1_electrical: '',
  s2_illegalElectrical: '',
  s3_geyser: '',
  s4_drainage: '',
  s5_leakingTaps: '',
  s6_missingKeys: '',
  s7_remoteControls: '',
  s8_alarmSecurity: '',
  s9_pool: '',
  s10_poolRepairs: '',
  s11_braaiFireplace: '',
  s12_blindsCurtains: '',
  s13_dampProblems: '',
  s14_roofLeaks: '',
  s15_crackedWindows: '',
  s16_bathsBasins: '',
  s17_floorTiles: '',
  s18_structuralDefects: '',
  s19_carpets: '',
  s20_builtInCupboards: '',
  s21_doorHandles: '',
  s22_boundaryFence: '',
  s23_buildingRestrictions: '',
  s24_buildingPlans: '',
  s25_approvedPlans: '',
  s26_otherDefects: '',
  s27_yearsResided: '',
  s28_existingLease: '',
  s29_limitedKnowledge: '',
  comments: '',
};

export const DEFAULT_WIZARD_DATA: LeaseWizardData = {
  // Step 1
  leaseType: 'fixed',
  leaseStartDate: '',
  leaseEndDate: '',
  rentAmount: 0,
  rentDueDay: 1,
  escalationPercent: 0,
  
  // Step 2 - Landlord
  landlordFullName: '',
  landlordIdNumber: '',
  landlordAddress: '',
  landlordEmail: '',
  landlordPhone: '',
  
  // Step 2 - Tenant
  tenantFullName: '',
  tenantIdNumber: '',
  tenantAddress: '',
  tenantEmail: '',
  tenantPhone: '',
  tenantIsJuristic: false,
  
  // Step 3
  propertyAddress: '',
  isSectionalTitle: false,
  bodyCorpRulesApply: false,
  
  // Step 4
  depositAmount: 0,
  lateFeeAmount: 250,
  
  // Step 5
  tenantIsIndividual: true,
  landlordActingInBusiness: true,
  cpaApplies: true,
  
  // Step 6
  hasPool: false,
  hasGarden: false,
  petsAllowed: false,
  smokingAllowed: false,
  hasAlarmSecurity: false,
  
  // Step 7
  poolMaintenanceBy: 'tenant',
  gardenMaintenanceBy: 'tenant',
  alarmMaintenanceBy: 'tenant',
  
  // Step 8
  conditionReport: DEFAULT_CONDITION_REPORT,
  conditionDetails: {},

  // Step 9
  excludedItemsList: '',
  
  // Bank Details
  landlordBankName: '',
  landlordBankCode: '',
  landlordAccountHolder: '',
  landlordBranchCode: '',
  landlordAccountNumber: '',
  landlordReference: '',
  
  // Occupants
  occupantsList: '',
};

// Wizard step configuration
export interface WizardStep {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  isRequired: boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Lease Basics', shortTitle: 'Basics', description: 'Lease type, dates, and rent', isRequired: true },
  { id: 2, title: 'Parties', shortTitle: 'Parties', description: 'Landlord and tenant details', isRequired: true },
  { id: 3, title: 'Property Details', shortTitle: 'Property', description: 'Property address and type', isRequired: true },
  { id: 4, title: 'Deposit & Fees', shortTitle: 'Deposit', description: 'Deposit and late fees', isRequired: true },
  { id: 5, title: 'Consumer Protection', shortTitle: 'CPA', description: 'Consumer Protection Act applicability', isRequired: true },
  { id: 6, title: 'Property Features', shortTitle: 'Features', description: 'Pool, garden, pets, smoking', isRequired: true },
  { id: 7, title: 'Maintenance', shortTitle: 'Maintenance', description: 'Who maintains what', isRequired: false },
  { id: 8, title: 'Condition Report', shortTitle: 'Condition', description: 'Property condition disclosure', isRequired: true },
  { id: 9, title: 'Exclusions', shortTitle: 'Exclusions', description: 'Items excluded from lease', isRequired: false },
  { id: 10, title: 'Review & Generate', shortTitle: 'Review', description: 'Review and generate PDF', isRequired: true },
];

// Validation helper type
export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
}

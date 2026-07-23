/**
 * Constants for rental application functionality
 */

// Form field names
export const FORM_FIELDS = {
  // Personal Information
  FIRST_NAME: 'first_name',
  MIDDLE_NAME: 'middle_name', 
  LAST_NAME: 'last_name',
  ID_NUMBER: 'id_number',
  PHONE: 'phone',
  
  // Employment Information
  EMPLOYMENT_STATUS: 'employment_status',
  JOB_TITLE: 'job_title',
  COMPANY_NAME: 'company_name',
  NET_MONTHLY_INCOME: 'net_monthly_income',
  
  // Residence Information
  CURRENT_ADDRESS: 'current_address',
  REASON_FOR_MOVING: 'reason_for_moving',
  PREVIOUS_LANDLORD_NAME: 'previous_landlord_name',
  PREVIOUS_LANDLORD_CONTACT: 'previous_landlord_contact',
  
  // Additional Information
  HAS_PETS: 'has_pets',
  PET_DETAILS: 'pet_details',
  SCREENING_CONSENT: 'screening_consent'
} as const;

// Required form fields
export const REQUIRED_FIELDS = [
  FORM_FIELDS.FIRST_NAME,
  FORM_FIELDS.LAST_NAME, 
  FORM_FIELDS.ID_NUMBER,
  FORM_FIELDS.PHONE,
  FORM_FIELDS.EMPLOYMENT_STATUS,
  FORM_FIELDS.CURRENT_ADDRESS,
  FORM_FIELDS.SCREENING_CONSENT
] as const;

// Employment / income type options shown in the wizard
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Permanently employed' },
  { value: 'contract', label: 'Contract or temporary work' },
  { value: 'self-employed', label: 'Self-employed / business owner' },
  { value: 'informal', label: 'Informal or cash income' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' }
] as const;

// Values that no longer appear in the picker but exist in older submissions
export const LEGACY_EMPLOYMENT_LABELS: Record<string, string> = {
  'temporarily-employed': 'Temporarily employed',
  unemployed: 'Unemployed',
  retired: 'Retired'
};

export const employmentStatusLabel = (value: string): string =>
  EMPLOYMENT_STATUS_OPTIONS.find((o) => o.value === value)?.label ||
  LEGACY_EMPLOYMENT_LABELS[value] ||
  value;

// Statuses that collect employer details ("employed-like")
export const EMPLOYED_STATUSES = ['employed', 'temporarily-employed', 'contract'] as const;

export const INCOME_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'daily', label: 'Daily' },
  { value: 'irregular', label: 'Irregular / per job' }
] as const;

export const RESIDENTIAL_STATUS_OPTIONS = [
  { value: 'renting', label: 'Renting' },
  { value: 'owning', label: 'Owning' },
  { value: 'living-with-family', label: 'Living with family' },
  { value: 'other', label: 'Other' }
] as const;

export const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
] as const;

// Experian free-report URL — override per environment with VITE_EXPERIAN_URL
export const EXPERIAN_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_EXPERIAN_URL) ||
  'https://up.experian.co.za';

// Screening consent — sourced from the shared consent registry so the
// recorded version/wording can never drift from what other consent_types use.
// NOTE: wording assumes legal sign-off; flag for POPIA/legal review before launch.
import { CONSENT_REGISTRY, PRIVACY_POLICY_VERSION as _PRIVACY_POLICY_VERSION } from './consentRegistry';
export const CREDIT_CONSENT_VERSION = CONSENT_REGISTRY.credit_check.version;
export const CREDIT_CONSENT_TEXT = CONSENT_REGISTRY.credit_check.text;
export const PRIVACY_POLICY_VERSION = _PRIVACY_POLICY_VERSION;

// Landlord-risk questions. Answers are stored keyed by id, so questions can be
// reworded/added here without schema changes.
export const RISK_QUESTIONS = [
  { id: 'debt_review', question: 'Are you currently under debt review?' },
  { id: 'outstanding_rent', question: 'Do you currently have rental arrears (unpaid rent owed to a landlord or agency)?' },
  { id: 'prior_eviction', question: 'Have you previously been evicted through a legal process?' },
  { id: 'lease_cancelled', question: 'Have you previously ended a lease before the agreed end date?' }
] as const;

// Question ids that appear in older submissions but are no longer asked —
// needed to render historical snapshots faithfully.
export const LEGACY_RISK_QUESTIONS: Record<string, string> = {
  judgments:
    'Are there any judgments, insolvency proceedings, sequestration matters, or material financial obligations that may affect your ability to pay the rent?'
};

export const riskQuestionText = (id: string): string =>
  RISK_QUESTIONS.find((q) => q.id === id)?.question || LEGACY_RISK_QUESTIONS[id] || id;

// Document types recorded in the documents table
export const DOCUMENT_TYPES = {
  ID_DOCUMENT: 'id',
  PROOF_OF_ADDRESS: 'proof_of_address',
  EXPERIAN_CREDIT_REPORT: 'experian_credit_report',
  BANK_STATEMENT: 'bank_statement',
  PAYSLIP: 'payslip',
  INCOME: 'income',
  PET_PHOTO: 'pet_photo'
} as const;

export const documentTypeLabel = (type: string): string =>
  ({
    id: 'Identity document',
    proof_of_address: 'Proof of address',
    experian_credit_report: 'Credit report',
    bank_statement: 'Bank statement',
    payslip: 'Payslip',
    income: 'Income document',
    pet_photo: 'Pet photo'
  })[type] || 'Document';

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Which income documents are required — configurable per product decision
export const INCOME_DOCUMENT_REQUIREMENT = {
  requirePayslip: false,
  requireBankStatements: false,
  requireAny: true
} as const;

// Application statuses (for applications table — must match the DB check
// constraint). 'pending' is a submitted application under review.
export const APPLICATION_STATUS = {
  INVITED: 'invited',
  PENDING: 'pending',
  MORE_INFO_REQUESTED: 'more_info_requested',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired'
} as const;

// Application request statuses (for application_requests table - matches DB constraint)
export const APPLICATION_REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

// Toast messages
export const TOAST_MESSAGES = {
  VALIDATION_ERROR: {
    title: "Validation Error",
    description: "Please fill in all required fields.",
    variant: "destructive" as const
  },
  CONSENT_REQUIRED: {
    title: "Consent Required", 
    description: "You must consent to the screening process to submit your application.",
    variant: "destructive" as const
  },
  ALREADY_SUBMITTED: {
    title: "Application Already Submitted",
    description: "You have already submitted an application for this property.",
    variant: "destructive" as const
  },
  SUCCESS: {
    title: "Application Submitted Successfully!",
    description: "Your rental application has been submitted and is being processed. You will be notified of the outcome."
  },
  SUBMISSION_FAILED: {
    title: "Submission Failed",
    description: "Failed to submit application. Please try again.",
    variant: "destructive" as const
  }
} as const;

// Navigation delays
export const NAVIGATION_DELAY = 2000;

// ARIA labels
export const ARIA_LABELS = {
  FORM_SECTION: "Rental application form section",
  PERSONAL_INFO: "Personal information section",
  EMPLOYMENT_INFO: "Employment information section", 
  RESIDENCE_INFO: "Current residence information section",
  ADDITIONAL_INFO: "Additional information section",
  SUBMIT_BUTTON: "Submit rental application",
  DASHBOARD_LINK: "Go to tenant dashboard"
} as const;
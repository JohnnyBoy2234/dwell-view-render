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

// Employment status options
export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self-employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' }
] as const;

// Application statuses
export const APPLICATION_STATUS = {
  INVITED: 'invited',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  DECLINED: 'declined'
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
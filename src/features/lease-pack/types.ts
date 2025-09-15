// SwiftRent Professional Lease Pack Types

export type Person = { 
  fullName: string; 
  idNumber: string; 
  email: string; 
  phone?: string; 
  address?: string; 
};

export type Parties = { 
  landlord: Person; 
  tenant: Person; 
  witnesses?: Person[]; 
};

export type LeaseCore = {
  leaseId: string;
  propertyAddress: string;
  propertyType: 'apartment' | 'house' | 'townhouse' | 'other';
  startDate: string; // ISO
  endDate: string; // ISO
  noticeDays: number; // e.g., 30
  monthlyRentZAR: number; 
  rentDueDay: number; 
  paymentMethod: 'SwiftRent' | 'EFT' | 'Other';
  depositZAR: number; 
  depositHeldIn: 'Trust' | 'Landlord' | 'Agent'; 
  depositRefundDays: number; // e.g., 14
  utilities: { 
    water: 'tenant' | 'landlord'; 
    electricity: 'tenant' | 'landlord'; 
    refuse: 'tenant' | 'landlord'; 
    internet?: 'tenant' | 'landlord'; 
  };
  conditionReportRequired: boolean; 
  petsAllowed: boolean; 
  maxOccupants: number;
  maintenanceMinorRepairLimitZAR: number; // tenant duty under limit
  houseRulesUrl?: string;
  governingLaw: 'South Africa';
};

export type Consent = { 
  eSignConsentVersion: string; 
  landlordConsentedAt?: string; 
  tenantConsentedAt?: string; 
};

export type Signatures = {
  tenant: { pngPath?: string; typedName?: string; signedAt?: string };
  landlord: { pngPath?: string; typedName?: string; signedAt?: string };
  initials?: { clause: string; tenantInitials?: string; landlordInitials?: string }[];
};

export type AuditEntry = { 
  actor: 'tenant' | 'landlord' | 'system'; 
  event: string; 
  at: string; 
  ip?: string; 
  userAgent?: string; 
  details?: any; 
};

export type LeasePack = {
  core: LeaseCore; 
  parties: Parties; 
  consent: Consent; 
  signatures: Signatures;
  auditLog: AuditEntry[];
  pdf: { finalPath?: string; finalSha256?: string; pageCount?: number; version: string };
};

export const ESIGN_CONSENT_TEXT = `Electronic Signature Consent (Version 1.0-ZA)
I agree to sign this Lease electronically. I confirm that my electronic signature is my intent to be legally bound by the Lease, that I have had the opportunity to review and download a copy, and that I consent to the creation of a tamper-evident record including my IP address, device information, timestamps (UTC & SAST) and a cryptographic hash of the executed PDF for verification. I understand I may request a paper copy but that electronic records will be the official version unless a law requires otherwise.`;

export const ESIGN_CONSENT_VERSION = "1.0-ZA";
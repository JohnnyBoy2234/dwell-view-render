/**
 * Single source of truth for what a user is consenting to: version + exact
 * wording, per consent_type row in the `consents` table. Every write site
 * pulls from here so recording an event and displaying its wording can never
 * drift apart the way the old scattered per-flow constants did.
 */

export type ConsentType = 'credit_check' | 'condition_approval' | 'lease_esignature';

export const PRIVACY_POLICY_VERSION = '2026-07';

export const CONSENT_REGISTRY: Record<ConsentType, { version: string; text: string }> = {
  credit_check: {
    version: '2026-07-v2',
    text:
      'I consent to the landlord, MzansiHomes and authorised screening providers using the ' +
      'information I supplied to perform identity, affordability, credit, rental-history and ' +
      'reference checks for this rental application.',
  },
  condition_approval: {
    // Fallback only — condition_records.attestation_text overrides per-row when set.
    version: '2026-07-v1',
    text: 'I agree the report fairly represents the condition of the property.',
  },
  lease_esignature: {
    version: '2026-07-v1',
    text:
      'I acknowledge that I have read and understood this lease agreement in its entirety. ' +
      'I consent to sign this document electronically and agree that my electronic signature ' +
      'has the same legal effect as a handwritten signature. I understand that this creates ' +
      'a legally binding agreement.',
  },
};

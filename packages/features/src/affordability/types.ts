// Shared types for the affordability-assessment feature (decision-support only).

export type AffordabilityStatus =
  | 'not_requested'
  | 'waiting_for_tenant'
  | 'consent_granted'
  | 'documents_uploaded'
  | 'processing'
  | 'assessment_ready'
  | 'processing_failed'
  | 'manual_review_required'
  | 'correction_requested'
  | 'expired'
  | 'deleted';

export type AffordabilityConfidence = 'high' | 'medium' | 'low' | 'unable_to_assess';

export type AffordabilityRecommendation =
  | 'strong'
  | 'acceptable'
  | 'further_review'
  | 'insufficient';

export interface AffordabilityAssessment {
  id: string;
  application_id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string | null;
  proposed_rent: number | null;
  status: AffordabilityStatus;
  confidence_status: AffordabilityConfidence | null;
  provider_status: 'self_hosted';
  rule_version: string | null;
  statement_period_start: string | null;
  statement_period_end: string | null;
  recommendation: AffordabilityRecommendation | null;
  output_metrics: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

export interface AffordabilityUploadLimits {
  max_file_bytes: number;
  max_files: number;
  allowed_mime: string[];
  required_months: number;
}

export interface AffordabilitySettings {
  consentVersion: string;
  consentText: string;
  uploadLimits: AffordabilityUploadLimits;
}

export interface AffordabilityContext {
  propertyTitle: string;
  landlordName: string;
  proposedRent: number | null;
}

export type AffordabilityDocumentStatus =
  | 'uploaded' | 'validating' | 'virus_scanning' | 'clean' | 'infected'
  | 'rejected' | 'processed' | 'failed' | 'deleted';

export type AffordabilityJobStatus =
  | 'uploaded' | 'validating' | 'virus_scanning' | 'extracting_text' | 'running_ocr'
  | 'detecting_bank' | 'extracting_transactions' | 'categorising_transactions'
  | 'validating_balances' | 'calculating_affordability' | 'generating_report'
  | 'completed' | 'requires_review' | 'failed';

export interface AffordabilityJob {
  id: string;
  status: AffordabilityJobStatus;
  progress: number;
  last_error: string | null;
}

export interface AffordabilityIncomeSource {
  id: string; label: string | null; category: string | null;
  is_verified_recurring: boolean; average_monthly_amount: number | null;
  months_present: number | null; transaction_ids: string[] | null;
}
export interface AffordabilityExpenseCategory {
  id: string; category: string; average_monthly_amount: number | null;
  is_recurring: boolean; transaction_ids: string[] | null;
}
export interface AffordabilityWarning {
  id: string; code: string; severity: 'info' | 'warning' | 'unable_to_verify' | 'potential_integrity';
  message: string;
}
export interface AffordabilityReasonCode {
  id: string; code: string; message: string; polarity: 'positive' | 'review' | 'negative' | 'neutral' | null;
}
export interface AffordabilityTransactionRow {
  id: string; txn_date: string | null; description: string | null; amount: number | null;
  direction: 'credit' | 'debit' | 'unknown'; balance_after: number | null; category: string | null;
  is_recurring: boolean; is_excluded: boolean; exclusion_reason: string | null;
  confidence_score: number | null; source_page: number | null;
  validation_status: string;
}
export interface AffordabilityReview {
  id: string; action: string; note: string | null;
  override_recommendation: string | null; override_reason: string | null; created_at: string;
}
export interface AffordabilityReport {
  assessment: AffordabilityAssessment | null;
  metrics: Record<string, number>;
  incomeSources: AffordabilityIncomeSource[];
  expenseCategories: AffordabilityExpenseCategory[];
  warnings: AffordabilityWarning[];
  reasonCodes: AffordabilityReasonCode[];
  transactions: AffordabilityTransactionRow[];
  reviews: AffordabilityReview[];
}

export interface AffordabilityDocument {
  id: string;
  original_filename: string | null;
  byte_size: number | null;
  status: AffordabilityDocumentStatus;
  detected_bank: string | null;
  rejection_reason: string | null;
  uploaded_at: string;
}

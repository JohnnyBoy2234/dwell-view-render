// @ts-nocheck
// Client-side data access for the affordability feature. Reads go through
// RLS-protected tables (tenant/landlord/admin isolation); writes that create
// consent/documents/etc. go through service-role edge functions.
import { supabase } from '@mzanzihomes/supabase/client';
import type {
  AffordabilityAssessment,
  AffordabilityContext,
  AffordabilityDocument,
  AffordabilityJob,
  AffordabilitySettings,
  AffordabilityUploadLimits,
} from './types';

const DEFAULT_LIMITS: AffordabilityUploadLimits = {
  max_file_bytes: 15_728_640,
  max_files: 6,
  allowed_mime: ['application/pdf'],
  required_months: 3,
};

/** Consent wording (active version) + upload limits, from configuration. */
export async function getAffordabilitySettings(): Promise<AffordabilitySettings> {
  const { data } = await supabase.from('affordability_settings').select('key, value');
  const map = new Map((data ?? []).map((r: any) => [r.key, r.value]));
  const version = (map.get('active_consent_version') as string) || 'v1';
  return {
    consentVersion: version,
    consentText: (map.get(`consent_text_${version}`) as string) || '',
    uploadLimits: (map.get('upload_limits') as AffordabilityUploadLimits) || DEFAULT_LIMITS,
  };
}

/** The current assessment for an application (or null). RLS scopes visibility. */
export async function getAssessment(applicationId: string): Promise<AffordabilityAssessment | null> {
  const { data } = await supabase
    .from('affordability_assessments')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  return (data as AffordabilityAssessment) ?? null;
}

/** Context shown on the consent screen: which property, landlord and rent. */
export async function getAffordabilityContext(applicationId: string): Promise<AffordabilityContext> {
  const { data: app } = await supabase
    .from('applications')
    .select('landlord_id, property_id')
    .eq('id', applicationId)
    .maybeSingle();

  let propertyTitle = 'this property';
  let proposedRent: number | null = null;
  let landlordName = 'your landlord';

  if (app?.property_id) {
    const { data: prop } = await supabase
      .from('properties').select('title, price').eq('id', app.property_id).maybeSingle();
    if (prop) {
      propertyTitle = prop.title || propertyTitle;
      proposedRent = prop.price ?? null;
    }
  }
  if (app?.landlord_id) {
    const { data: prof } = await supabase
      .from('profiles').select('display_name').eq('user_id', app.landlord_id).maybeSingle();
    if (prof?.display_name) landlordName = prof.display_name;
  }
  return { propertyTitle, landlordName, proposedRent };
}

/** Record the tenant's consent (server-side, versioned, audited). */
export async function recordAffordabilityConsent(
  applicationId: string
): Promise<{ assessmentId: string; status: string; consentVersion: string }> {
  const { data, error } = await supabase.functions.invoke('affordability-consent', {
    body: { applicationId },
  });
  if (error) throw new Error(error.message || 'Could not record consent');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

/** List the (non-deleted) uploaded statements for an application. */
export async function listAffordabilityDocuments(applicationId: string): Promise<AffordabilityDocument[]> {
  const assessment = await getAssessment(applicationId);
  if (!assessment) return [];
  const { data } = await supabase
    .from('affordability_documents')
    .select('id, original_filename, byte_size, status, detected_bank, rejection_reason, uploaded_at')
    .eq('assessment_id', assessment.id)
    .neq('status', 'deleted')
    .order('uploaded_at', { ascending: true });
  return (data as AffordabilityDocument[]) ?? [];
}

/** Upload one statement PDF (validated + stored server-side). */
export async function uploadAffordabilityDocument(
  applicationId: string,
  file: File
): Promise<AffordabilityDocument> {
  const form = new FormData();
  form.append('applicationId', applicationId);
  form.append('file', file);
  const { data, error } = await supabase.functions.invoke('affordability-upload', { body: form });
  if (error) {
    // Surface the server's message where available.
    const ctx = await (error as any)?.context?.json?.().catch(() => null);
    throw new Error(ctx?.error || error.message || 'Upload failed');
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).document as AffordabilityDocument;
}

/** Remove an uploaded statement before submitting for analysis. */
export async function deleteAffordabilityDocument(applicationId: string, documentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('affordability-documents', {
    body: { action: 'delete', applicationId, documentId },
  });
  if (error) throw new Error(error.message || 'Could not remove the file');
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Short-lived signed URL to preview a statement (server-audited). */
export async function getAffordabilityDocumentUrl(applicationId: string, documentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('affordability-documents', {
    body: { action: 'signed_url', applicationId, documentId },
  });
  if (error) throw new Error(error.message || 'Could not open the file');
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).url as string;
}

/** Submit the uploaded statements for analysis (creates the processing job). */
export async function submitAffordabilityForAnalysis(
  applicationId: string
): Promise<{ jobId: string; status: string }> {
  const { data, error } = await supabase.functions.invoke('affordability-documents', {
    body: { action: 'submit', applicationId },
  });
  if (error) throw new Error(error.message || 'Could not submit for analysis');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

/** Kick off (or retry) processing. Safe to call more than once — the runner
 *  claims the job idempotently. */
export async function startAffordabilityProcessing(
  applicationId: string
): Promise<{ started: boolean; status?: string }> {
  const { data, error } = await supabase.functions.invoke('affordability-process', {
    body: { applicationId },
  });
  if (error) throw new Error(error.message || 'Could not start processing');
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

/** Latest processing job for the application's assessment (for status polling). */
export async function getProcessingJob(applicationId: string): Promise<AffordabilityJob | null> {
  const assessment = await getAssessment(applicationId);
  if (!assessment) return null;
  const { data } = await supabase
    .from('affordability_processing_jobs')
    .select('id, status, progress, last_error')
    .eq('assessment_id', assessment.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AffordabilityJob) ?? null;
}

/** Full assessment detail for the landlord report (RLS-scoped). */
export async function getAffordabilityReport(applicationId: string) {
  const assessment = await getAssessment(applicationId);
  if (!assessment) {
    return { assessment: null, metrics: {}, incomeSources: [], expenseCategories: [], warnings: [], reasonCodes: [], transactions: [], reviews: [] };
  }
  const id = assessment.id;
  const [income, expenses, warnings, reasons, txns, reviews] = await Promise.all([
    supabase.from('affordability_income_sources').select('id, label, category, is_verified_recurring, average_monthly_amount, months_present, transaction_ids').eq('assessment_id', id),
    supabase.from('affordability_expense_categories').select('id, category, average_monthly_amount, is_recurring, transaction_ids').eq('assessment_id', id),
    supabase.from('affordability_warnings').select('id, code, severity, message').eq('assessment_id', id),
    supabase.from('affordability_reason_codes').select('id, code, message, polarity').eq('assessment_id', id),
    supabase.from('affordability_transactions').select('id, txn_date, description, amount, direction, balance_after, category, is_recurring, is_excluded, exclusion_reason, confidence_score, source_page, validation_status').eq('assessment_id', id).order('txn_date', { ascending: true }),
    supabase.from('affordability_reviews').select('id, action, note, override_recommendation, override_reason, created_at').eq('assessment_id', id).order('created_at', { ascending: false }),
  ]);
  return {
    assessment,
    metrics: (assessment.output_metrics as Record<string, number>) || {},
    incomeSources: income.data || [],
    expenseCategories: expenses.data || [],
    warnings: warnings.data || [],
    reasonCodes: reasons.data || [],
    transactions: txns.data || [],
    reviews: reviews.data || [],
  };
}

/** Tenant/landlord correction request, or tenant human-review request. */
export async function submitAffordabilityCorrection(
  applicationId: string,
  payload: { action?: 'correction' | 'human_review'; message?: string; targetTransactionId?: string }
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('affordability-correction', {
    body: { applicationId, ...payload },
  });
  if (error) throw new Error(error.message || 'Could not submit your request');
  if ((data as any)?.error) throw new Error((data as any).error);
}

/** Landlord/admin review action (note / mark reviewed / override / request info). */
export async function submitAffordabilityReview(
  applicationId: string,
  payload: {
    action: 'note' | 'mark_reviewed' | 'override' | 'request_more_info' | 'request_another_statement';
    note?: string; overrideRecommendation?: string; overrideReason?: string; message?: string;
  }
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('affordability-review', {
    body: { applicationId, ...payload },
  });
  if (error) throw new Error(error.message || 'Could not save the review action');
  if ((data as any)?.error) throw new Error((data as any).error);
}

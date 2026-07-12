import { supabase } from '@mzanzihomes/supabase/client';
import { removeApplicationDocument } from './documentService';
import { mergeDraft, type ApplicationFormData, type DocRef } from '../types';

export interface ApplicationDraft {
  formData: ApplicationFormData;
  currentStep: number;
  completedSteps: number[];
  updatedAt: string | null;
}

export const STEP_COUNT = 8;

export const completionPercentage = (completedSteps: number[]): number =>
  Math.round((completedSteps.length / STEP_COUNT) * 100);

export async function loadDraft(tenantId: string, propertyId: string): Promise<ApplicationDraft | null> {
  const { data, error } = await (supabase.from('application_drafts') as any)
    .select('form_data, current_step, completed_steps, updated_at')
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { form_data: unknown; current_step: number; completed_steps: number[]; updated_at: string };
  return {
    formData: mergeDraft(row.form_data),
    currentStep: row.current_step ?? 0,
    completedSteps: row.completed_steps ?? [],
    updatedAt: row.updated_at ?? null
  };
}

export async function saveDraft(
  tenantId: string,
  propertyId: string,
  landlordId: string,
  inviteId: string | undefined,
  draft: Omit<ApplicationDraft, 'updatedAt'>
): Promise<void> {
  const { error } = await (supabase.from('application_drafts') as any).upsert(
    {
      tenant_id: tenantId,
      property_id: propertyId,
      landlord_id: landlordId,
      invite_id: inviteId ?? null,
      form_data: draft.formData,
      current_step: draft.currentStep,
      completed_steps: draft.completedSteps
    },
    { onConflict: 'tenant_id,property_id' }
  );
  if (error) throw error;
}

/** Every document referenced by the draft, for start-over cleanup. */
export function draftDocuments(formData: ApplicationFormData): DocRef[] {
  return [
    formData.identity.document,
    formData.address.proof_document,
    ...formData.credit.report_documents,
    ...formData.employment.income_documents,
    ...formData.household.pets.map((p) => p.photo)
  ].filter((d): d is DocRef => d != null);
}

/** Start over: removes the draft row and every document it uploaded. */
export async function deleteDraft(
  tenantId: string,
  propertyId: string,
  formData: ApplicationFormData
): Promise<void> {
  await Promise.allSettled(draftDocuments(formData).map(removeApplicationDocument));
  const { error } = await (supabase.from('application_drafts') as any)
    .delete()
    .eq('tenant_id', tenantId)
    .eq('property_id', propertyId);
  if (error) throw error;
}

import { supabase } from '@mzanzihomes/supabase/client';
import {
  CREDIT_CONSENT_TEXT,
  CREDIT_CONSENT_VERSION,
  PRIVACY_POLICY_VERSION
} from '@mzanzihomes/common/constants/applicationConstants';
import type { ApplicationFormData } from '../types';
import { draftDocuments } from './draftService';

const formatAddress = (a: ApplicationFormData['address']): string =>
  [a.line1, a.line2, a.suburb, a.city, a.province, a.postal_code, a.country]
    .filter(Boolean)
    .join(', ');

export interface SubmitArgs {
  userId: string;
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  formData: ApplicationFormData;
}

/**
 * Submits the application:
 *  - updates the reusable tenant profile (screening_details / screening_profiles),
 *    keeping the legacy flat columns populated for the lease wizard and landlord views
 *  - creates the applications row with a versioned, timestamped snapshot
 *  - records the credit-check consent event with the exact wording shown
 *  - links uploaded documents to the application
 * Returns the new application id.
 */
export async function submitApplication({ userId, propertyId, landlordId, inviteId, formData }: SubmitArgs): Promise<string | null> {
  const now = new Date().toISOString();
  const { personal, identity, address, credit, employment, household, risk } = formData;

  const petSummary = household.has_pets
    ? household.pets
        .map((p) => [p.count > 1 ? `${p.count}x` : '', p.type, p.breed, p.age && `age ${p.age}`].filter(Boolean).join(' '))
        .join('; ')
    : '';

  const { error: profileError } = await (supabase.from('screening_profiles') as any).upsert(
    [
      {
        user_id: userId,
        first_name: personal.first_name,
        middle_name: personal.middle_name,
        last_name: personal.last_name,
        has_pets: household.has_pets,
        pet_details: petSummary,
        pets: household.pets,
        household: {
          total_occupants: Number(household.total_occupants) || null,
          adults: Number(household.adults) || null,
          children: Number(household.children) || 0,
          child_age_ranges: household.child_age_ranges
        },
        occupants: household.occupants,
        risk_answers: risk.answers,
        screening_consent: credit.consent,
        screening_consent_date: now,
        is_complete: true,
        // superseded by the documents table — clear stale public-URL entries
        documents: [],
        updated_at: now
      }
    ],
    { onConflict: 'user_id' }
  );
  if (profileError) throw profileError;

  const { error: detailsError } = await (supabase.from('screening_details') as any).upsert(
    [
      {
        user_id: userId,
        full_name: [personal.first_name, personal.last_name].filter(Boolean).join(' '),
        id_number: identity.id_number,
        id_type: identity.id_type,
        id_expiry_date: identity.id_expiry_date || null,
        date_of_birth: identity.date_of_birth || null,
        nationality: identity.nationality,
        phone: personal.phone,
        employment_status: employment.status,
        job_title: employment.job_title,
        company_name: employment.employer_name || employment.business_name || employment.institution,
        net_monthly_income: parseFloat(employment.net_monthly_income) || null,
        gross_monthly_income: parseFloat(employment.gross_monthly_income) || null,
        employment,
        current_address: formatAddress(address),
        address,
        reason_for_moving: address.reason_for_moving,
        previous_landlord_name: address.previous_landlord_name,
        previous_landlord_contact: address.previous_landlord_contact,
        consent_given: credit.consent,
        updated_at: now
      }
    ],
    { onConflict: 'user_id' }
  );
  if (detailsError) throw detailsError;

  await (supabase.from('profiles') as any)
    .update({ is_tenant_screened: true })
    .eq('user_id', userId);

  // Replace any previous non-accepted application for this property
  await (supabase.from('applications') as any)
    .delete()
    .eq('tenant_id', userId)
    .eq('property_id', propertyId)
    .neq('status', 'accepted');

  const { data, error } = await (supabase.from('applications') as any)
    .insert({
      property_id: propertyId,
      tenant_id: userId,
      landlord_id: landlordId,
      status: 'pending',
      submitted_at: now,
      version: 1,
      snapshot: formData
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  const applicationId: string | null = data?.id ?? null;

  if (applicationId) {
    const { error: consentError } = await (supabase.from('credit_check_consents') as any).insert({
      application_id: applicationId,
      tenant_id: userId,
      consented: credit.consent,
      consent_version: CREDIT_CONSENT_VERSION,
      consent_text_snapshot: CREDIT_CONSENT_TEXT,
      privacy_policy_version: PRIVACY_POLICY_VERSION,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    });
    if (consentError) throw consentError;

    const paths = draftDocuments(formData).map((d) => d.path);
    if (paths.length > 0) {
      await (supabase.from('documents') as any)
        .update({ application_id: applicationId })
        .in('file_path', paths);
    }

    if (inviteId) {
      await (supabase.from('application_invites') as any)
        .update({ status: 'used', used_at: now })
        .eq('id', inviteId);
    }

    try {
      await supabase.functions.invoke('trigger-credit-check', {
        body: { application_id: applicationId, tenant_id: userId }
      });
    } catch (err) {
      console.warn('Credit check trigger failed', err);
    }
  }

  // The submission owns the documents now; the draft row can go (documents stay)
  await (supabase.from('application_drafts') as any)
    .delete()
    .eq('tenant_id', userId)
    .eq('property_id', propertyId);

  return applicationId;
}

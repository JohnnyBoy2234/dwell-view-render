// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TOAST_MESSAGES, NAVIGATION_DELAY, APPLICATION_STATUS, FORM_FIELDS } from '@mzanzihomes/common/constants/applicationConstants';
import type { FormData } from './useApplicationForm';

interface SubmissionOptions {
  propertyId: string;
  landlordId: string;
  inviteId?: string;
  onSubmissionComplete?: () => void;
}

export function useApplicationSubmission(options: SubmissionOptions) {
  const { propertyId, landlordId, inviteId, onSubmissionComplete } = options;
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const submitApplication = async (formData: FormData, userId: string, userEmail: string) => {
    if (!userId) return;

    setSubmitting(true);

    try {
      // Save screening profile
      await saveScreeningProfile(formData, userId);
      
      // Save screening details  
      await saveScreeningDetails(formData, userId);
      
      // Mark tenant as screened
      await markTenantAsScreened(userId);
      
      // Create application
      const applicationResult = await createApplication(userId);
      
      // Mark invite as used if provided
      if (inviteId) {
        await markInviteAsUsed(inviteId);
      }
      
      // Trigger credit check
      await triggerCreditCheck(applicationResult.data.id, userId);
      
      toast(TOAST_MESSAGES.SUCCESS);
      
      // Handle post-submission
      if (onSubmissionComplete) {
        onSubmissionComplete();
      } else {
        setTimeout(() => {
          navigate('/tenant-dashboard');
        }, NAVIGATION_DELAY);
      }

    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        ...TOAST_MESSAGES.SUBMISSION_FAILED,
        description: error.message || TOAST_MESSAGES.SUBMISSION_FAILED.description
      });
    } finally {
      setSubmitting(false);
    }
  };

  const saveScreeningProfile = async (formData: FormData, userId: string) => {
    const { error } = await supabase
      .from('screening_profiles')
      .upsert([{
        user_id: userId,
        first_name: formData[FORM_FIELDS.FIRST_NAME],
        middle_name: formData[FORM_FIELDS.MIDDLE_NAME],
        last_name: formData[FORM_FIELDS.LAST_NAME],
        has_pets: formData[FORM_FIELDS.HAS_PETS],
        pet_details: formData[FORM_FIELDS.PET_DETAILS],
        screening_consent: formData[FORM_FIELDS.SCREENING_CONSENT],
        screening_consent_date: new Date().toISOString(),
        is_complete: true,
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });

    if (error) throw error;
  };

  const saveScreeningDetails = async (formData: FormData, userId: string) => {
    const { error } = await supabase
      .from('screening_details')
      .upsert([{
        user_id: userId,
        full_name: `${formData[FORM_FIELDS.FIRST_NAME]} ${formData[FORM_FIELDS.LAST_NAME]}`,
        id_number: formData[FORM_FIELDS.ID_NUMBER],
        phone: formData[FORM_FIELDS.PHONE],
        employment_status: formData[FORM_FIELDS.EMPLOYMENT_STATUS],
        job_title: formData[FORM_FIELDS.JOB_TITLE],
        company_name: formData[FORM_FIELDS.COMPANY_NAME],
        net_monthly_income: parseFloat(formData[FORM_FIELDS.NET_MONTHLY_INCOME]) || null,
        current_address: formData[FORM_FIELDS.CURRENT_ADDRESS],
        reason_for_moving: formData[FORM_FIELDS.REASON_FOR_MOVING],
        previous_landlord_name: formData[FORM_FIELDS.PREVIOUS_LANDLORD_NAME],
        previous_landlord_contact: formData[FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT],
        consent_given: formData[FORM_FIELDS.SCREENING_CONSENT],
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id' });

    if (error) throw error;
  };

  const markTenantAsScreened = async (userId: string) => {
    await supabase
      .from('profiles')
      .update({ is_tenant_screened: true })
      .eq('user_id', userId);
  };

  const createApplication = async (userId: string) => {
    const applicationData = {
      tenant_id: userId,
      landlord_id: landlordId,
      property_id: propertyId,
      status: APPLICATION_STATUS.SUBMITTED,
      created_at: new Date().toISOString()
    };

    const result = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (result.error) {
      console.error("Supabase createApplication error:", result.error.message, result.error.details, result.error.hint, result.error.code);
      throw result.error;
    }
    return result;
  };

  const markInviteAsUsed = async (inviteId: string) => {
    await supabase
      .from('application_invites')
      .update({ 
        status: 'used', 
        used_at: new Date().toISOString() 
      })
      .eq('id', inviteId);
  };

  const triggerCreditCheck = async (applicationId: string, tenantId: string) => {
    try {
      await supabase.functions.invoke('trigger-credit-check', {
        body: { 
          application_id: applicationId,
          tenant_id: tenantId 
        }
      });
    } catch (error) {
      console.warn('Credit check trigger failed:', error);
      // Don't throw - continue with success flow
    }
  };

  return {
    submitting,
    submitApplication
  };
}
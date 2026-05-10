import { useState, useCallback } from 'react';
import { FORM_FIELDS, REQUIRED_FIELDS, TOAST_MESSAGES } from '@/constants/applicationConstants';
import { useToast } from '@/hooks/use-toast';

export interface FormData {
  [FORM_FIELDS.FIRST_NAME]: string;
  [FORM_FIELDS.MIDDLE_NAME]: string;
  [FORM_FIELDS.LAST_NAME]: string;
  [FORM_FIELDS.ID_NUMBER]: string;
  [FORM_FIELDS.PHONE]: string;
  [FORM_FIELDS.EMPLOYMENT_STATUS]: string;
  [FORM_FIELDS.JOB_TITLE]: string;
  [FORM_FIELDS.COMPANY_NAME]: string;
  [FORM_FIELDS.NET_MONTHLY_INCOME]: string;
  [FORM_FIELDS.CURRENT_ADDRESS]: string;
  [FORM_FIELDS.REASON_FOR_MOVING]: string;
  [FORM_FIELDS.PREVIOUS_LANDLORD_NAME]: string;
  [FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT]: string;
  [FORM_FIELDS.HAS_PETS]: boolean;
  [FORM_FIELDS.PET_DETAILS]: string;
  [FORM_FIELDS.SCREENING_CONSENT]: boolean;
}

const createInitialFormData = (): FormData => ({
  [FORM_FIELDS.FIRST_NAME]: '',
  [FORM_FIELDS.MIDDLE_NAME]: '',
  [FORM_FIELDS.LAST_NAME]: '',
  [FORM_FIELDS.ID_NUMBER]: '',
  [FORM_FIELDS.PHONE]: '',
  [FORM_FIELDS.EMPLOYMENT_STATUS]: '',
  [FORM_FIELDS.JOB_TITLE]: '',
  [FORM_FIELDS.COMPANY_NAME]: '',
  [FORM_FIELDS.NET_MONTHLY_INCOME]: '',
  [FORM_FIELDS.CURRENT_ADDRESS]: '',
  [FORM_FIELDS.REASON_FOR_MOVING]: '',
  [FORM_FIELDS.PREVIOUS_LANDLORD_NAME]: '',
  [FORM_FIELDS.PREVIOUS_LANDLORD_CONTACT]: '',
  [FORM_FIELDS.HAS_PETS]: false,
  [FORM_FIELDS.PET_DETAILS]: '',
  [FORM_FIELDS.SCREENING_CONSENT]: false
});

export function useApplicationForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(createInitialFormData());

  const updateField = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(createInitialFormData());
  }, []);

  const validateForm = useCallback((): boolean => {
    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (!formData[field]) {
        toast(TOAST_MESSAGES.VALIDATION_ERROR);
        return false;
      }
    }

    // Check screening consent specifically
    if (!formData[FORM_FIELDS.SCREENING_CONSENT]) {
      toast(TOAST_MESSAGES.CONSENT_REQUIRED);
      return false;
    }

    return true;
  }, [formData, toast]);

  return {
    formData,
    updateField,
    resetForm,
    validateForm
  };
}
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { APPLICATION_STATUS } from '@mzanzihomes/common/constants/applicationConstants';

interface ExistingApplication {
  id: string;
  status: string;
  created_at: string;
  tenant_id: string;
  property_id: string;
  landlord_id: string;
}

export function useExistingApplication(userId: string | undefined, propertyId: string) {
  const [existingApplication, setExistingApplication] = useState<ExistingApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      checkExistingApplication();
    } else {
      setLoading(false);
    }
  }, [userId, propertyId]);

  const checkExistingApplication = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: application, error: queryError } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', userId)
        .eq('property_id', propertyId)
        .maybeSingle();

      if (queryError) throw queryError;

      setExistingApplication(application);
    } catch (err: any) {
      console.error('Error checking existing application:', err);
      setError(err.message || 'Failed to check existing application');
    } finally {
      setLoading(false);
    }
  };

  const canSubmitNewApplication = () => {
    return !existingApplication || existingApplication.status === APPLICATION_STATUS.INVITED;
  };

  const shouldShowApplicationForm = () => {
    return canSubmitNewApplication();
  };

  return {
    existingApplication,
    loading,
    error,
    canSubmitNewApplication,
    shouldShowApplicationForm,
    refetch: checkExistingApplication
  };
}
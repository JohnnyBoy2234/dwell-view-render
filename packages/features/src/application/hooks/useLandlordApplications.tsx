// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
import { useRealtime } from '@mzanzihomes/supabase/hooks/useRealtime';

export interface ApplicationWithTenant {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  properties?: {
    id: string;
    title: string;
    location: string;
    images: string[];
  };
  tenant_profile?: {
    display_name: string;
    user_id: string;
  };
  screening_profile?: {
    first_name: string;
    last_name: string;
    is_complete: boolean;
    created_at: string;
  };
  screening_details?: {
    full_name: string;
    id_number: string;
    phone: string;
    employment_status: string;
    job_title: string;
    company_name: string;
    net_monthly_income: number;
    current_address: string;
    reason_for_moving: string;
    previous_landlord_name: string;
    previous_landlord_contact: string;
    consent_given: boolean;
  };
  documents?: Array<{
    id: string;
    document_type: string;
    file_path: string;
    file_type: string;
    status: string;
    uploaded_at: string;
  }>;
}

export const useLandlordApplications = (propertyId?: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<ApplicationWithTenant[]>([]);
  const [loading, setLoading] = useState(false);

  // Move useEffect after useCallback definitions

  const fetchApplications = useCallback(async () => {
    if (!user || !propertyId) return;

    setLoading(true);
    try {
      // First get applications
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select('*')
        .eq('property_id', propertyId)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Then fetch related data for each application
      const applicationsWithProfiles = await Promise.all(
        (applicationsData || []).map(async (app) => {
          const [tenantProfile, screeningProfile, screeningDetails, documents] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name, user_id')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('screening_profiles')
              .select('first_name, last_name, is_complete, created_at')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('screening_details')
              .select('full_name, id_number, phone, employment_status, job_title, company_name, net_monthly_income, current_address, reason_for_moving, previous_landlord_name, previous_landlord_contact, consent_given')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('documents')
              .select('id, document_type, file_path, file_type, status, uploaded_at')
              .eq('user_id', app.tenant_id)
          ]);

          // id_number is encrypted at rest; decrypt it for the landlord (allowed
          // because they have an application relationship) so the review shows
          // the real ID rather than ciphertext.
          let details = screeningDetails.data || undefined;
          if (details) {
            try {
              const { data: plainId } = await supabase.rpc('get_id_number', { p_user_id: app.tenant_id, p_source: 'screening' });
              if (plainId) details = { ...details, id_number: plainId as string };
            } catch { /* leave as-is */ }
          }

          return {
            ...app,
            tenant_profile: tenantProfile.data || undefined,
            screening_profile: screeningProfile.data || undefined,
            screening_details: details,
            documents: documents.data || []
          } as ApplicationWithTenant;
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        variant: "destructive",
        title: "Error loading applications",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [user, propertyId, toast]);

  // Function to fetch all applications for a landlord across all properties
  const fetchAllApplications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // First get all applications for the landlord
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        setApplications([]);
        return;
      }

      // Then fetch related data for each application
      const applicationsWithProfiles = await Promise.all(
        (applicationsData || []).map(async (app) => {
          const [tenantProfile, screeningProfile, screeningDetails, documents, property] = await Promise.all([
            supabase
              .from('profiles')
              .select('display_name, user_id')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('screening_profiles')
              .select('first_name, last_name, is_complete, created_at')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('screening_details')
              .select('full_name, id_number, phone, employment_status, job_title, company_name, net_monthly_income, current_address, reason_for_moving, previous_landlord_name, previous_landlord_contact, consent_given')
              .eq('user_id', app.tenant_id)
              .maybeSingle(),
            supabase
              .from('documents')
              .select('id, document_type, file_path, file_type, status, uploaded_at')
              .eq('user_id', app.tenant_id),
            supabase
              .from('properties')
              .select('id, title, location, images')
              .eq('id', app.property_id)
              .maybeSingle()
          ]);

          let details2 = screeningDetails.data || undefined;
          if (details2) {
            try {
              const { data: plainId } = await supabase.rpc('get_id_number', { p_user_id: app.tenant_id, p_source: 'screening' });
              if (plainId) details2 = { ...details2, id_number: plainId as string };
            } catch { /* leave as-is */ }
          }

          return {
            ...app,
            properties: property.data || undefined,
            tenant_profile: tenantProfile.data || undefined,
            screening_profile: screeningProfile.data || undefined,
            screening_details: details2,
            documents: documents.data || []
          } as ApplicationWithTenant;
        })
      );

      setApplications(applicationsWithProfiles);
    } catch (error: any) {
      console.error('Error fetching all applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch applications when dependencies change
  useEffect(() => {
    if (user) {
      if (propertyId) {
        fetchApplications();
      } else {
        // If no propertyId, fetch all applications for the landlord
        fetchAllApplications();
      }
    }
  }, [user, propertyId, fetchApplications, fetchAllApplications]);

  // Set up real-time updates for applications
  useRealtime({
    onApplicationChange: () => {
      console.log('🔄 Refreshing landlord applications due to real-time update');
      if (propertyId) {
        fetchApplications();
      } else {
        fetchAllApplications();
      }
    }
  });

  const updateApplicationStatus = useCallback(async (applicationId: string, status: string) => {
    // Optimistically update local state so UI reflects immediately
    const previous = applications;
    setApplications((current) => current.map((app) => app.id === applicationId ? { ...app, status } : app));

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status })
        .eq('id', applicationId)
        .eq('landlord_id', user?.id);

      if (error) throw error;

      // Refresh from server to reconcile and pull any related changes
      if (propertyId) {
        await fetchApplications();
      } else {
        await fetchAllApplications();
      }
      
      toast({
        title: "Success",
        description: `Application ${status === 'accepted' ? 'accepted' : 'declined'} successfully`,
      });

      return true;
    } catch (error) {
      console.error('Error updating application:', error);
      // Revert optimistic update on error
      setApplications(previous);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
      return false;
    }
  }, [applications, user, propertyId, fetchApplications, fetchAllApplications, toast]);

  return {
    applications,
    loading,
    fetchApplications,
    fetchAllApplications,
    updateApplicationStatus,
  };
};
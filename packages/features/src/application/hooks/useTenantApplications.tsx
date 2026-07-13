// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

export interface TenantApplication {
  id: string;
  tenant_id: string;
  landlord_id: string;
  property_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  viewing_id?: string;
  property?: {
    id: string;
    title: string;
    location: string;
    images: string[];
    price: number;
  };
  landlord?: {
    user_id: string;
    display_name: string;
  };
}

export const useTenantApplications = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (user) {
      fetchApplications();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  const fetchApplications = async () => {
    if (!user) {
      console.log('No user found for applications fetch');
      return;
    }
    
    console.log('Fetching applications for tenant:', user.id);
    if (!isMountedRef.current) return;
    setLoading(true);
    try {
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Applications fetch result:', { applicationsData, error });

      if (error) throw error;

      if (applicationsData && applicationsData.length > 0) {
        console.log('Found applications, fetching related data');
        // Get unique property and landlord IDs
        const propertyIds = Array.from(new Set(applicationsData.map(app => app.property_id)));
        const landlordIds = Array.from(new Set(applicationsData.map(app => app.landlord_id)));

        console.log('Property IDs:', propertyIds);
        console.log('Landlord IDs:', landlordIds);

        // Fetch property details
        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select('id, title, location, images, price')
          .in('id', propertyIds);

        if (propertiesError) throw propertiesError;

        // Fetch landlord profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', landlordIds);

        if (profilesError) throw profilesError;

        // Map the data
        const propertiesById = new Map(propertiesData?.map(p => [p.id, p]) || []);
        const profilesById = new Map(profilesData?.map(p => [p.user_id, p]) || []);

        const enrichedApplications: TenantApplication[] = applicationsData.map(app => ({
          ...app,
          property: propertiesById.get(app.property_id),
          landlord: profilesById.get(app.landlord_id)
        }));

        console.log('Final enriched applications:', enrichedApplications);
        if (isMountedRef.current) {
          setApplications(enrichedApplications);
          setError(false);
        }
      } else {
        console.log('No applications found');
        if (isMountedRef.current) {
          setApplications([]);
          setError(false);
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      // keep any previously loaded applications; the UI shows a retry warning
      if (isMountedRef.current) {
        setError(true);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getApplicationForProperty = (propertyId: string): TenantApplication | null => {
    return applications.find(app => app.property_id === propertyId) || null;
  };

  const hasApplicationForProperty = (propertyId: string): boolean => {
    return applications.some(app => app.property_id === propertyId);
  };

  const getApplicationStatus = (propertyId: string): string | null => {
    const application = getApplicationForProperty(propertyId);
    return application?.status || null;
  };

  return {
    applications,
    loading,
    error,
    getApplicationForProperty,
    hasApplicationForProperty,
    getApplicationStatus,
    refresh: fetchApplications
  };
};
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data: applicationsData, error } = await supabase
        .from('applications')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (applicationsData && applicationsData.length > 0) {
        // Get unique property and landlord IDs
        const propertyIds = Array.from(new Set(applicationsData.map(app => app.property_id)));
        const landlordIds = Array.from(new Set(applicationsData.map(app => app.landlord_id)));

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

        setApplications(enrichedApplications);
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setApplications([]);
    } finally {
      setLoading(false);
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
    getApplicationForProperty,
    hasApplicationForProperty,
    getApplicationStatus,
    refresh: fetchApplications
  };
};
// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Property {
  id: string;
  title: string;
  location: string;
  landlord_id: string;
  created_at: string;
}

export const useUserProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [hasProperties, setHasProperties] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProperties = async () => {
      if (!user) {
        setProperties([]);
        setHasProperties(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('landlord_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        const propertyList = data || [];
        setProperties(propertyList);
        setHasProperties(propertyList.length > 0);
      } catch (error) {
        console.error('Error fetching user properties:', error);
        setProperties([]);
        setHasProperties(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProperties();
  }, [user]);

  return { properties, hasProperties, loading };
};
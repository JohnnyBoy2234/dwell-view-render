import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useUserProperties = () => {
  const { user } = useAuth();
  const [hasProperties, setHasProperties] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserProperties = async () => {
      if (!user) {
        setHasProperties(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id')
          .eq('landlord_id', user.id)
          .limit(1);

        if (error) throw error;
        setHasProperties((data || []).length > 0);
      } catch (error) {
        console.error('Error checking user properties:', error);
        setHasProperties(false);
      } finally {
        setLoading(false);
      }
    };

    checkUserProperties();
  }, [user]);

  return { hasProperties, loading };
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadCounts() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['maintenance-unread-counts', user?.id],
    queryFn: async () => {
      if (!user) return {};
      
      // For now, return empty object since we don't have messaging system implemented
      // This can be extended when we add maintenance messaging
      return {};
    },
    enabled: !!user,
  });
}
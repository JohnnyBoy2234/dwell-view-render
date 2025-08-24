import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

export function useTenantResponses() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['tenant-maintenance-responses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // For now, return empty array since we don't have messaging system implemented
      // This can be extended when we add maintenance messaging
      return [];
    },
    enabled: !!user,
  });
}
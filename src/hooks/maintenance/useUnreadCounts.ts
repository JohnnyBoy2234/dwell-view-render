import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadCounts() {
  const { user, isLandlord } = useAuth();

  return useQuery({
    queryKey: ['maintenance-unread-counts', user?.id, isLandlord],
    queryFn: async () => {
      if (!user) return {};

      const column = isLandlord ? 'landlord_id' : 'tenant_id';
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('status')
        .eq(column, user.id);

      if (error) throw error;

      type StatusRow = { status: string };
      const counts: Record<string, number> = {};
      (data as StatusRow[] | null)?.forEach((req) => {
        counts[req.status] = (counts[req.status] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });
}
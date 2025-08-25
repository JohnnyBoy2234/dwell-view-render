import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['maintenance-unread-counts', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0 };

      // Count unread maintenance messages where the user is the recipient
      const { data, error } = await supabase
        .from('maintenance_messages')
        .select('id')
        .eq('recipient_user_id', user.id)
        .is('read_at', null);

      if (error) throw error;

      return { total: data?.length || 0 };
    },
    enabled: !!user,
  });
}
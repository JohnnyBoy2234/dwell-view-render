import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    // Accept an array of message IDs to batch update
    mutationFn: async (messageIds: string[] | string) => {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];
      if (ids.length === 0) return { success: true };
      const { error } = await (supabase
        .from('maintenance_messages')
        .update({ read_at: new Date().toISOString() } as any)
        .in('id', ids as any) as any);
      if (error) throw error;
      return { success: true };
    },
    retry: 0,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-messages'] });
      qc.invalidateQueries({ queryKey: ['maintenance-unread-counts'] });
    },
  });
}

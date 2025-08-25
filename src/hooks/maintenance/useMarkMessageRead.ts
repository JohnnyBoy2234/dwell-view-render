import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMarkMessageRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('maintenance_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-messages'] });
      qc.invalidateQueries({ queryKey: ['maintenance-unread-counts'] });
    },
  });
}

// @ts-nocheck
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

export function useUnpaidBill() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['unpaid-bill', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*, properties(title, location), bill_line_items(*)')
        .eq('status', 'sent')
        .order('sent_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data; // null when nothing unpaid
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('unpaid-bill-watch')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_bills', filter: `tenant_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unpaid-bill', user.id] });
          queryClient.invalidateQueries({ queryKey: ['tenant-bills'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return query;
}

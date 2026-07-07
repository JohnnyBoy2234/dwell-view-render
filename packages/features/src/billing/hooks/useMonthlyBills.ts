// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';

export interface BillLineItemInput {
  category: 'water' | 'sewage' | 'electricity' | 'refuse' | 'other';
  label: string;
  amount: number;
}

export function useMonthlyBills() {
  const queryClient = useQueryClient();

  const billsQuery = useQuery({
    queryKey: ['monthly-bills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*, properties(title, location), bill_line_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendBill = useMutation({
    mutationFn: async ({ billId, lineItems }: { billId: string; lineItems: BillLineItemInput[] }) => {
      const { data, error } = await supabase.functions.invoke('send-monthly-bill', {
        body: { billId, lineItems },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to send bill');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monthly-bills'] }),
  });

  return { billsQuery, sendBill };
}

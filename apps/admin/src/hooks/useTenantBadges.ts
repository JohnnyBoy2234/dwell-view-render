import { useQuery } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';

export function useTenantBadges(tenantId?: string) {
  return useQuery({
    queryKey: ['tenant-badges', tenantId],
    queryFn: async () => {
      if (!tenantId) return { badges: [], currentYearStars: 0 };

      const currentYear = new Date().getFullYear();

      // Fetch badges
      const { data: badges } = await (supabase as any)
        .from('tenant_badges')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('badge_year', { ascending: false });

      // Fetch current year stars
      const { data: stars } = await (supabase as any)
        .from('tenant_payment_stars')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('year', currentYear);

      return {
        badges: badges || [],
        currentYearStars: stars?.length || 0
      };
    },
    enabled: !!tenantId
  });
}

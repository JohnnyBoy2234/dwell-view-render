import { useQuery } from '@tanstack/react-query';
import type { TicketUnreadSummary } from '@/types/maintenance';

async function fetchResponses(): Promise<TicketUnreadSummary[]> {
  const res = await fetch('/api/maintenance/responses/unread');
  if (!res.ok) throw new Error('failed');
  return res.json();
}

export function useTenantResponses() {
  return useQuery({ queryKey: ['tenant-maintenance-responses'], queryFn: fetchResponses });
}

import { useInfiniteQuery } from '@tanstack/react-query';
import type { MaintenanceMessage } from '@/types/maintenance';

interface MessagesResponse {
  messages: MaintenanceMessage[];
  cursor: string | null;
}

async function fetchMessages(ticketId: string, cursor?: string): Promise<MessagesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  params.set('limit', '20');
  const res = await fetch(`/api/maintenance/tickets/${ticketId}/messages?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json();
}

export function useTicketMessages(ticketId: string) {
  return useInfiniteQuery({
    queryKey: ['maintenance-messages', ticketId],
    queryFn: ({ pageParam }) => fetchMessages(ticketId, pageParam),
    getNextPageParam: (lastPage) => lastPage.cursor || undefined,
  });
}

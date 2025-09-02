import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MaintenanceMessage, Role } from '@/types/maintenance';

interface MessagesResponse {
  messages: MaintenanceMessage[];
  cursor: string | null;
}

async function fetchMessages(ticketId: string, cursor?: string): Promise<MessagesResponse> {
  let query = supabase
    .from('maintenance_messages')
    .select(`
      id,
      maintenance_request_id,
      sender_user_id,
      sender_role,
      recipient_user_id,
      body,
      attachments,
      created_at,
      read_at,
      updated_at
    `)
    .eq('maintenance_request_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const messages: MaintenanceMessage[] = data?.map(msg => ({
    id: msg.id,
    ticketId: msg.maintenance_request_id,
    senderUserId: msg.sender_user_id,
    senderRole: (msg.sender_role === 'tenant' ? 'TENANT' : 'LANDLORD') as Role,
    recipientUserId: msg.recipient_user_id,
    body: msg.body,
    attachments: msg.attachments,
    createdAt: msg.created_at,
    readAt: msg.read_at,
  })) || [];

  return {
    messages,
    cursor: messages.length === 20 ? messages[messages.length - 1].createdAt : null,
  };
}

export function useTicketMessages(ticketId: string) {
  return useInfiniteQuery({
    queryKey: ['maintenance-messages', ticketId],
    queryFn: ({ pageParam }) => fetchMessages(ticketId, pageParam as string),
    getNextPageParam: (lastPage: MessagesResponse) => lastPage.cursor || undefined,
    initialPageParam: undefined as string | undefined,
  });
}

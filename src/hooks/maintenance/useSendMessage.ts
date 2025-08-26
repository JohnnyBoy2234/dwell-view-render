import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { MaintenanceMessage, Role } from '@/types/maintenance';

async function sendMessage(
  ticketId: string,
  body: string,
  files: File[],
  senderUserId: string,
  senderRole: 'tenant' | 'landlord'
): Promise<MaintenanceMessage> {
  // First get the maintenance request to determine recipient
  const { data: maintenanceRequest, error: requestError } = await supabase
    .from('maintenance_requests')
    .select('tenant_id, landlord_id')
    .eq('id', ticketId)
    .single();

  if (requestError) throw requestError;

  const recipientUserId = senderRole === 'tenant' 
    ? maintenanceRequest.landlord_id 
    : maintenanceRequest.tenant_id;

  // For now, we'll just store file names in attachments array
  // In a full implementation, you'd upload files to storage first
  const attachments = files.map(f => f.name);

  const { data, error } = await supabase
    .from('maintenance_messages')
    .insert({
      maintenance_request_id: ticketId,
      sender_user_id: senderUserId,
      sender_role: senderRole,
      recipient_user_id: recipientUserId,
      body,
      attachments,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    ticketId: data.maintenance_request_id,
    senderUserId: data.sender_user_id,
    senderRole: (data.sender_role === 'tenant' ? 'TENANT' : 'LANDLORD') as Role,
    recipientUserId: data.recipient_user_id,
    body: data.body,
    attachments: data.attachments,
    createdAt: data.created_at,
    readAt: data.read_at,
  };
}

export function useSendMessage(ticketId: string) {
  const qc = useQueryClient();
  const { user, isLandlord } = useAuth();
  return useMutation({
    mutationFn: ({ body, files }: { body: string; files: File[] }) =>
      sendMessage(ticketId, body, files, user?.id || '', isLandlord ? 'landlord' : 'tenant'),
    onMutate: async ({ body }) => {
      await qc.cancelQueries({ queryKey: ['maintenance-messages', ticketId] });
      const previous = qc.getQueryData<any>(['maintenance-messages', ticketId]);
      const optimistic: MaintenanceMessage = {
        id: `temp-${Date.now()}`,
        ticketId,
        senderUserId: user?.id || 'temp',
        senderRole: (isLandlord ? 'LANDLORD' : 'TENANT') as Role,
        recipientUserId: 'temp',
        body,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData(['maintenance-messages', ticketId], (data: any) => ({
        pages: [
          { cursor: null, messages: [optimistic, ...(data?.pages?.[0]?.messages || [])] },
          ...(data?.pages?.slice(1) || []),
        ],
        pageParams: [undefined, ...(data?.pageParams || [])],
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      qc.setQueryData(['maintenance-messages', ticketId], context?.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-messages', ticketId] });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import type { MaintenanceMessage, Role } from '@/types/maintenance';

async function sendMessage(
  ticketId: string,
  body: string,
  files: File[],
  senderUserId: string,
  senderRole: Role
): Promise<MaintenanceMessage> {
  const formData = new FormData();
  formData.append('body', body);
  formData.append('senderUserId', senderUserId);
  formData.append('senderRole', senderRole);
  files.forEach(f => formData.append('attachments', f));
  const res = await fetch(`/api/maintenance/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to send');
  return res.json();
}

export function useSendMessage(ticketId: string) {
  const qc = useQueryClient();
  const { user, isLandlord } = useAuth();
  return useMutation({
    mutationFn: ({ body, files }: { body: string; files: File[] }) =>
      sendMessage(ticketId, body, files, user?.id || '', isLandlord ? 'LANDLORD' : 'TENANT'),
    onMutate: async ({ body }) => {
      await qc.cancelQueries({ queryKey: ['maintenance-messages', ticketId] });
      const previous = qc.getQueryData<any>(['maintenance-messages', ticketId]);
      const optimistic: MaintenanceMessage = {
        id: `temp-${Date.now()}`,
        ticketId,
        senderUserId: user?.id || 'temp',
        senderRole: isLandlord ? 'LANDLORD' : 'TENANT',
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

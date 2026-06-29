import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';
import type { MaintenanceMessage, Role } from '@mzanzihomes/common/types/maintenance';

async function sendMessage(
  ticketId: string,
  body: string,
  files: File[],
  senderUserId: string,
  senderRole: 'tenant' | 'landlord'
): Promise<MaintenanceMessage> {
  // First get the maintenance request to determine recipient
  const { data: maintenanceRequest, error: requestError} = await (supabase
    .from('maintenance_requests')
    .select('tenant_id, landlord_id')
    .eq('id', ticketId as any)
    .single() as any);

  if (requestError) throw requestError;

  const recipientUserId = senderRole === 'tenant' 
    ? (maintenanceRequest as any).landlord_id 
    : (maintenanceRequest as any).tenant_id;

  // Upload files to maintenance-images storage bucket and get URLs
  const attachmentUrls: string[] = [];
  
  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${senderUserId}/${ticketId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('maintenance-images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading maintenance file:', uploadError);
      continue; // Skip failed uploads
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('maintenance-images')
      .getPublicUrl(uploadData.path);

    attachmentUrls.push(publicUrl);
  }

  const { data, error } = await (supabase
    .from('maintenance_messages')
    .insert({
      maintenance_request_id: ticketId,
      sender_user_id: senderUserId,
      sender_role: senderRole,
      recipient_user_id: recipientUserId,
      body,
      attachments: attachmentUrls, // Store URLs instead of file names
    } as any)
    .select()
    .single() as any);

  if (error) throw error;

  const dataResult = data as any;
  return {
    id: dataResult.id,
    ticketId: dataResult.maintenance_request_id,
    senderUserId: dataResult.sender_user_id,
    senderRole: (dataResult.sender_role === 'tenant' ? 'TENANT' : 'LANDLORD') as Role,
    recipientUserId: dataResult.recipient_user_id,
    body: dataResult.body,
    attachments: dataResult.attachments,
    createdAt: dataResult.created_at,
    readAt: dataResult.read_at,
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
      const tempId = `temp-${Date.now()}`;
      const optimistic: MaintenanceMessage = {
        id: tempId,
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
      return { previous, tempId };
    },
    retry: 0,
    onError: (_err, _vars, context) => {
      qc.setQueryData(['maintenance-messages', ticketId], context?.previous);
    },
    onSuccess: (created, _vars, context) => {
      // Replace optimistic temp message with actual one
      qc.setQueryData(['maintenance-messages', ticketId], (data: any) => {
        if (!data) return data;
        const pages = (data.pages || []).map((page: any, idx: number) => {
          if (idx !== 0) return page;
          const messages = (page.messages || []).map((m: MaintenanceMessage) =>
            m.id === context?.tempId
              ? {
                  id: created.id,
                  ticketId: created.ticketId,
                  senderUserId: created.senderUserId,
                  senderRole: created.senderRole,
                  recipientUserId: created.recipientUserId,
                  body: created.body,
                  attachments: created.attachments,
                  createdAt: created.createdAt,
                  readAt: created.readAt,
                }
              : m
          );
          return { ...page, messages };
        });
        return { ...data, pages };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-messages', ticketId] });
      qc.invalidateQueries({ queryKey: ['maintenance-unread-counts'] });
    },
  });
}

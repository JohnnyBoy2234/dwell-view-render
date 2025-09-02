import { useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { useTicketMessages } from '@/hooks/maintenance/useTicketMessages';
import { useSendMessage } from '@/hooks/maintenance/useSendMessage';
import { useMarkMessageRead } from '@/hooks/maintenance/useMarkMessageRead';
import { useAuth } from '@/hooks/useAuth';

interface MaintenanceThreadProps {
  ticketId: string;
}

export function MaintenanceThread({ ticketId }: MaintenanceThreadProps) {
  const { user } = useAuth();
  const { data, fetchNextPage, hasNextPage } = useTicketMessages(ticketId);
  const sendMessage = useSendMessage(ticketId);
  const markRead = useMarkMessageRead();

  useEffect(() => {
    const unread = data?.pages.flatMap(p => (p as any).messages?.filter((m: any) => !m.readAt)) || [];
    const ids = unread.map((m: any) => m.id);
    if (ids.length > 0) {
      markRead.mutate(ids);
    }
  }, [data, markRead]);

  const handleSend = (body: string, files: File[]) => {
    sendMessage.mutate({ body, files });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {data?.pages.map((page: any) => (
          <div key={page.cursor}>
            {page.messages?.map((msg: any) => (
              <MessageBubble key={msg.id} message={msg} currentUserId={user?.id || ''} />
            ))}
          </div>
        ))}
        {hasNextPage && (
          <button onClick={() => fetchNextPage()} className="text-sm underline">
            Load older messages
          </button>
        )}
      </div>
      <div className="border-t p-4">
        <MessageComposer onSend={handleSend} disabled={sendMessage.isPending} />
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { MaintenanceMessage } from '@/types/maintenance';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: MaintenanceMessage;
  currentUserId: string;
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isOwn = message.senderUserId === currentUserId;
  return (
    <div className={cn('flex mb-4', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3 shadow',
          isOwn ? 'bg-ocean-blue text-white' : 'bg-muted'
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary">{message.senderRole}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: message.body }} />
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((fileName, index) => (
              <div
                key={index}
                className="block text-xs text-muted-foreground"
              >
                📎 {fileName}
              </div>
            ))}
          </div>
        )}
        {message.readAt && isOwn && (
          <div className="text-[10px] text-right mt-1 text-muted-foreground">✓ Read</div>
        )}
      </div>
    </div>
  );
}

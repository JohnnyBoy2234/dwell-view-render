import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Check, CheckCheck, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  optimistic?: boolean;
  profiles?: { display_name: string } | null;
}

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  isLandlord?: boolean;
  showTime?: boolean;
}

export function MessageBubble({ message, currentUserId, isLandlord = false, showTime = false }: MessageBubbleProps) {
  const isOwn = message.sender_id === currentUserId;
  const isRead = isLandlord ? message.read_by_landlord : message.read_by_tenant;
  const messageTime = new Date(message.created_at);
  const isToday = new Date().toDateString() === messageTime.toDateString();
  
  const getMessageStatus = () => {
    if (!isOwn) return null;
    
    if (message.optimistic) {
      return <Clock className="h-3 w-3 opacity-60" />;
    }
    
    if (isRead) {
      return <CheckCheck className="h-3 w-3 opacity-60 text-ios-blue" />;
    }
    
    return <Check className="h-3 w-3 opacity-60" />;
  };

  return (
    <div className={cn(
      'flex items-end gap-2 mb-1 animate-fade-in',
      isOwn ? 'justify-end' : 'justify-start'
    )}>
      <div
        className={cn(
          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 shadow-sm transition-all duration-200',
          isOwn 
            ? 'bg-ios-blue text-white rounded-br-sm' 
            : 'bg-card border border-border rounded-bl-sm'
        )}
      >
        {!isOwn && message.profiles?.display_name && (
          <div className="text-xs font-medium text-ios-blue mb-1">
            {message.profiles.display_name}
          </div>
        )}
        
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
        
        <div className={cn(
          'flex items-center justify-end gap-1 mt-1 text-xs',
          isOwn ? 'text-white/70' : 'text-muted-foreground'
        )}>
          <span>
            {isToday 
              ? format(messageTime, 'HH:mm')
              : format(messageTime, 'MMM dd, HH:mm')
            }
          </span>
          {getMessageStatus()}
        </div>
      </div>
    </div>
  );
}

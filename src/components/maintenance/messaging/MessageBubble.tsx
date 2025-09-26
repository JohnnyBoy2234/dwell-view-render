import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        
        <MessageContent content={message.content} isOwn={isOwn} />
        
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

// Inline component to render message content with link handling and CTA for application invites
function MessageContent({ content, isOwn }: { content: string; isOwn: boolean }) {
  // Basic URL detection
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlRegex) || [];
  const inviteUrl = urls.find((u) => u.includes('/apply/invite/'));

  // Convert URLs in text to clickable anchors
  const parts = content.split(urlRegex);
  const interleaved: (string | JSX.Element)[] = [];
  for (let i = 0; i < parts.length; i++) {
    interleaved.push(parts[i]);
    if (i < parts.length - 1 && urls[i]) {
      const href = urls[i];
      interleaved.push(
        <a
          key={`${href}-${i}`}
          href={href}
          className={cn('underline break-all', isOwn ? 'text-white' : 'text-primary')}
        >
          {href}
        </a>
      );
    }
  }

  return (
    <div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {interleaved}
      </div>
      {inviteUrl && (
        <div className="mt-2">
          <Button
            size="sm"
            className={cn(isOwn ? 'bg-white text-ios-blue hover:bg-white/90' : undefined)}
            onClick={() => {
              window.location.href = inviteUrl;
            }}
          >
            Start Application
          </Button>
        </div>
      )}
    </div>
  );
}

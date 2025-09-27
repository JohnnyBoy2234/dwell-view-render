import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Clock, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ARIA_LABELS } from '@/constants/messagesConstants';
import type { Conversation } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

interface ConversationItemProps {
  conversation: Conversation;
  onClick: (conversation: Conversation) => void;
}

/**
 * Individual conversation item component
 * Displays conversation details with proper accessibility and interaction
 */
export function ConversationItem({ conversation, onClick }: ConversationItemProps) {
  const handleClick = () => {
    onClick(conversation);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(conversation);
    }
  };

  const unread = conversation.unread_count > 0;

  return (
    <Card
      className={cn(
        'cursor-pointer border-ocean-blue/15 transition-all duration-300 ease-out-soft relative overflow-hidden',
        'hover:shadow-card hover:-translate-y-[2px] hover:border-ocean-blue/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-blue focus-visible:ring-offset-2',
        'animate-conversation-entry'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${ARIA_LABELS.CONVERSATION_ITEM} ${conversation.other_user_name}`}
    >
      {unread && (
        <div className="absolute inset-0 bg-ocean-blue/5 animate-[pulse_2.4s_ease-in-out_infinite]" aria-hidden="true" />
      )}
      <CardContent className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-success-green rounded-full flex items-center justify-center flex-shrink-0 shadow-soft">
              <User className="w-5 h-5 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {conversation.other_user_name}
                </h4>
                {unread && (
                  <Badge
                    className="bg-success-green text-white text-xs animate-badge-pop shadow-soft"
                    aria-label={`${ARIA_LABELS.UNREAD_COUNT}: ${conversation.unread_count}`}
                  >
                    {conversation.unread_count}
                  </Badge>
                )}
              </div>

              {conversation.property_title && (
                <p className="text-xs text-muted-foreground mb-1 truncate">
                  Re: {conversation.property_title}
                </p>
              )}

              <p className="text-sm text-muted-foreground truncate">
                {conversation.last_message}
              </p>

              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <time
                  className="tracking-tight"
                  dateTime={conversation.last_message_time}
                  aria-label={ARIA_LABELS.MESSAGE_TIME}
                >
                  {format(new Date(conversation.last_message_time), 'MMM d, h:mm a')}
                </time>
              </div>
            </div>
          </div>

          <Send className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-60 group-hover:opacity-90 transition-opacity duration-200" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
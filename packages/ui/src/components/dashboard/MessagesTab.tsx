import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useConversations } from '@/hooks/useConversations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ConversationItem } from '@/components/messaging/ConversationItem';
import { MessagesEmptyState } from '@/components/messaging/MessagesEmptyState';
import { MessagesLoadingState } from '@/components/messaging/MessagesLoadingState';
import { MESSAGE_ROUTES, UI_CONSTANTS, ARIA_LABELS } from '@mzanzihomes/common/constants/messagesConstants';
import type { Conversation } from '@/hooks/useConversations';
import { cn } from '@mzanzihomes/common/lib/utils';

/**
 * Messages tab component for dashboard
 * Displays recent conversations with navigation to full messages view
 */
export function MessagesTab() {
  const { user, isLandlord } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const { conversations, loading, error } = useConversations(user?.id);
  const navigate = useNavigate();

  const handleConversationClick = (conversation: Conversation) => {
    const messagesPath = isLandlord ? MESSAGE_ROUTES.LANDLORD_MESSAGES : MESSAGE_ROUTES.TENANT_MESSAGES;
    const queryParams = new URLSearchParams({
      user: conversation.other_user_id,
      property: conversation.property_id || ''
    });
    navigate(`${messagesPath}?${queryParams.toString()}`);
  };

  const handleViewAllMessages = () => {
    navigate(isLandlord ? MESSAGE_ROUTES.LANDLORD_MESSAGES : MESSAGE_ROUTES.TENANT_MESSAGES);
  };

  if (loading) {
    return <MessagesLoadingState />;
  }

  if (error) {
    console.error('Messages loading error:', error);
  }

  return (
    <div className="space-y-5" role="region" aria-label={ARIA_LABELS.MESSAGES_SECTION}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-ocean-blue text-white shadow-soft flex items-center justify-center">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Messages</h2>
            <p className="text-xs text-muted-foreground">Stay in sync with tenants and landlords</p>
          </div>
          {unreadCount > 0 && (
            <Badge
              className="bg-success-green text-white text-xs animate-badge-pop"
              aria-label={`${ARIA_LABELS.UNREAD_COUNT}: ${unreadCount}`}
            >
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewAllMessages}
          aria-label={ARIA_LABELS.VIEW_ALL_MESSAGES}
        >
          View All
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-ocean-blue/5 rounded-3xl blur-xl opacity-40" aria-hidden="true" />
        <div className="relative rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md shadow-soft">
          <div className="p-4 space-y-3">
            {conversations.length === 0 ? (
              <MessagesEmptyState isLandlord={isLandlord} />
            ) : (
              <>
                {conversations
                  .slice(0, UI_CONSTANTS.MAX_CONVERSATIONS_SHOWN)
                  .map((conversation, index) => (
                    <div key={`${conversation.other_user_id}${UI_CONSTANTS.CONVERSATION_KEY_SEPARATOR}${conversation.property_id || UI_CONSTANTS.GENERAL_CONVERSATION_KEY}`}>
                      <ConversationItem
                        conversation={conversation}
                        onClick={handleConversationClick}
                      />
                      {index < conversations.length - 1 && (
                        <div className="h-px bg-gradient-to-r from-transparent via-ocean-blue/10 to-transparent my-2" aria-hidden="true" />
                      )}
                    </div>
                  ))}

                {conversations.length > UI_CONSTANTS.MAX_CONVERSATIONS_SHOWN && (
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleViewAllMessages}
                  >
                    View {conversations.length - UI_CONSTANTS.MAX_CONVERSATIONS_SHOWN} more conversations
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

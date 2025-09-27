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
import { MESSAGE_ROUTES, UI_CONSTANTS, ARIA_LABELS } from '@/constants/messagesConstants';
import type { Conversation } from '@/hooks/useConversations';

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
    // Fall back to empty state if there's an error
  }

  return (
    <div className="space-y-4" role="region" aria-label={ARIA_LABELS.MESSAGES_SECTION}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-ocean-blue" />
          <h2 className="text-xl font-bold">Messages</h2>
          {unreadCount > 0 && (
            <Badge 
              className="bg-earth-warm text-white"
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

      {!loading && conversations.length === 0 ? (
        <MessagesEmptyState isLandlord={isLandlord} />
      ) : (
        <div className="space-y-3">
          {conversations.slice(0, UI_CONSTANTS.MAX_CONVERSATIONS_SHOWN).map((conversation) => (
            <ConversationItem
              key={`${conversation.other_user_id}${UI_CONSTANTS.CONVERSATION_KEY_SEPARATOR}${conversation.property_id || UI_CONSTANTS.GENERAL_CONVERSATION_KEY}`}
              conversation={conversation}
              onClick={handleConversationClick}
            />
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
        </div>
      )}
    </div>
  );
}

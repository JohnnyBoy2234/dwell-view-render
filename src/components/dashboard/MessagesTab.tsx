import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  property_id?: string;
  is_read: boolean;
  sender_profile?: {
    display_name: string;
  };
  receiver_profile?: {
    display_name: string;
  };
  properties?: {
    title: string;
  };
}

interface Conversation {
  other_user_id: string;
  other_user_name: string;
  property_title?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  property_id?: string;
}

export function MessagesTab() {
  const { user, isLandlord } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey (
            display_name
          ),
          receiver_profile:profiles!messages_receiver_id_fkey (
            display_name
          ),
          properties (
            title
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation (other user + property)
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach((message: any) => {
        const isFromMe = message.sender_id === user.id;
        const otherUserId = isFromMe ? message.receiver_id : message.sender_id;
        const otherUserName = isFromMe 
          ? message.receiver_profile?.display_name || 'Unknown User'
          : message.sender_profile?.display_name || 'Unknown User';
        
        const conversationKey = `${otherUserId}-${message.property_id || 'general'}`;
        
        if (!conversationMap.has(conversationKey)) {
          conversationMap.set(conversationKey, {
            other_user_id: otherUserId,
            other_user_name: otherUserName,
            property_title: message.properties?.title,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
            property_id: message.property_id
          });
        }

        // Count unread messages (messages from others that are unread)
        if (!isFromMe && !message.is_read) {
          const conversation = conversationMap.get(conversationKey)!;
          conversation.unread_count++;
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    const messagesPath = isLandlord ? '/messages' : '/tenant-messages';
    navigate(`${messagesPath}?user=${conversation.other_user_id}&property=${conversation.property_id || ''}`);
  };

  const handleViewAllMessages = () => {
    navigate(isLandlord ? '/messages' : '/tenant-messages');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-6 w-6 text-ocean-blue" />
          <h2 className="text-xl font-bold">Messages</h2>
          <div className="animate-pulse bg-muted h-6 w-12 rounded-full"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-muted h-20 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-ocean-blue" />
          <h2 className="text-xl font-bold">Messages</h2>
          {unreadCount > 0 && (
            <Badge className="bg-earth-warm text-white">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleViewAllMessages}
        >
          View All
        </Button>
      </div>

      {conversations.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent>
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground">
              {isLandlord 
                ? "Messages from tenants and applicants will appear here"
                : "Messages from landlords will appear here"
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {conversations.slice(0, 5).map((conversation, index) => (
            <Card 
              key={`${conversation.other_user_id}-${conversation.property_id || 'general'}`}
              className="cursor-pointer hover:shadow-md transition-all duration-200 border-ocean-blue/20"
              onClick={() => handleConversationClick(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-ocean-blue to-success-green rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm truncate">
                          {conversation.other_user_name}
                        </h4>
                        {conversation.unread_count > 0 && (
                          <Badge className="bg-earth-warm text-white text-xs">
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
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conversation.last_message_time), 'MMM d, h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Send className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
          
          {conversations.length > 5 && (
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={handleViewAllMessages}
            >
              View {conversations.length - 5} more conversations
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

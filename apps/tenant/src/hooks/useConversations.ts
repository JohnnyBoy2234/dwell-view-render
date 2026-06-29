import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MESSAGE_QUERY_FIELDS, UI_CONSTANTS } from '@mzanzihomes/common/constants/messagesConstants';

export interface Message {
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

export interface Conversation {
  other_user_id: string;
  other_user_name: string;
  property_title?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  property_id?: string;
}

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data: messages, error: queryError } = await supabase
        .from('messages')
        .select(MESSAGE_QUERY_FIELDS)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      const processedConversations = processMessagesIntoConversations(messages || [], userId);
      setConversations(processedConversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const processMessagesIntoConversations = (messages: any[], currentUserId: string): Conversation[] => {
    const conversationMap = new Map<string, Conversation>();

    messages.forEach((message: any) => {
      const isFromMe = message.sender_id === currentUserId;
      const otherUserId = isFromMe ? message.receiver_id : message.sender_id;
      const otherUserName = isFromMe 
        ? message.receiver_profile?.display_name || UI_CONSTANTS.DEFAULT_USER_NAME
        : message.sender_profile?.display_name || UI_CONSTANTS.DEFAULT_USER_NAME;
      
      const conversationKey = `${otherUserId}${UI_CONSTANTS.CONVERSATION_KEY_SEPARATOR}${message.property_id || UI_CONSTANTS.GENERAL_CONVERSATION_KEY}`;
      
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

    return Array.from(conversationMap.values());
  };

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations
  };
}
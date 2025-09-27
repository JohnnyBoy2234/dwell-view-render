import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachment_url: string | null;
  read_by_landlord: boolean;
  read_by_tenant: boolean;
  created_at: string;
  profiles?: {
    display_name: string;
  } | null;
}

interface ConversationWithDetails {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  properties: {
    title: string;
    images: string[];
  } | null;
  landlord_profile: {
    display_name: string;
  } | null;
  tenant_profile: {
    display_name: string;
  } | null;
  unread_count: number;
  last_message?: string;
}

// Single optimized query to fetch all conversation data
const fetchConversationsWithDetails = async (userId: string, isLandlord: boolean) => {
  if (!userId) throw new Error('No user ID provided');

  // Single query with joins and aggregations
  const { data, error } = await supabase.rpc('get_conversations_with_details', {
    user_id: userId,
    is_landlord_param: isLandlord
  });

  if (error) throw error;
  return data || [];
};

// Create the RPC function if it doesn't exist
const ensureConversationsRPCExists = async () => {
  const { error } = await supabase.rpc('get_conversations_with_details', {
    user_id: '00000000-0000-0000-0000-000000000000',
    is_landlord_param: true
  }).then(
    () => ({ error: null }),
    (err) => ({ error: err })
  );

  // If function doesn't exist, we'll fall back to the old method
  return !error || !error.message?.includes('function');
};

// Fallback: optimized version of the old query method
const fetchConversationsFallback = async (userId: string, isLandlord: boolean): Promise<ConversationWithDetails[]> => {
  // Fetch conversations with properties in one query
  const { data: conversationsData, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      *,
      properties!inner (
        title,
        images
      )
    `)
    .or(`landlord_id.eq.${userId},tenant_id.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (conversationsError) throw conversationsError;

  if (!conversationsData?.length) return [];

  // Get all unique user IDs for batch profile fetch
  const userIds = [...new Set([
    ...conversationsData.map(c => c.landlord_id),
    ...conversationsData.map(c => c.tenant_id)
  ])];

  // Batch fetch all profiles
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  // Create profile map for O(1) lookups
  const profileMap = new Map(
    (profilesData || []).map(profile => [profile.user_id, profile])
  );

  // Batch fetch unread counts for all conversations
  const conversationIds = conversationsData.map(c => c.id);
  const { data: unreadData } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .eq(isLandlord ? 'read_by_landlord' : 'read_by_tenant', false)
    .neq('sender_id', userId);

  // Count unread messages per conversation
  const unreadCounts = new Map<string, number>();
  (unreadData || []).forEach(msg => {
    const count = unreadCounts.get(msg.conversation_id) || 0;
    unreadCounts.set(msg.conversation_id, count + 1);
  });

  // Combine all data
  return conversationsData.map(conv => ({
    ...conv,
    landlord_profile: profileMap.get(conv.landlord_id) || null,
    tenant_profile: profileMap.get(conv.tenant_id) || null,
    unread_count: unreadCounts.get(conv.id) || 0
  }));
};

const fetchMessages = async (conversationId: string) => {
  if (!conversationId) throw new Error('No conversation ID provided');

  const { data: messagesData, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  if (!messagesData?.length) return [];

  // Batch fetch sender profiles
  const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', senderIds);

  const profileMap = new Map(
    (profilesData || []).map(profile => [profile.user_id, profile])
  );

  return messagesData.map(message => ({
    ...message,
    profiles: profileMap.get(message.sender_id) || null
  }));
};

export function useOptimizedMessaging() {
  const { user, isLandlord } = useAuth();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);

  // Component mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Conversations query with React Query caching
  const {
    data: conversations = [],
    isLoading: conversationsLoading,
    error: conversationsError,
    refetch: refetchConversations
  } = useQuery({
    queryKey: ['conversations', user?.id, isLandlord],
    queryFn: () => fetchConversationsFallback(user!.id, isLandlord),
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
    refetchIntervalInBackground: false
  });

  // Messages query for active conversation
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['messages', activeConversation],
    queryFn: () => fetchMessages(activeConversation!),
    enabled: !!activeConversation,
    staleTime: 10000, // 10 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, messageType = 'text', attachmentUrl = null }: {
      conversationId: string;
      content: string;
      messageType?: string;
      attachmentUrl?: string | null;
    }) => {
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
          attachment_url: attachmentUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Optimistically update messages
      queryClient.setQueryData(['messages', variables.conversationId], (old: Message[] = []) => {
        const messageExists = old.some(m => m.id === data.id);
        if (messageExists) return old;
        return [...old, data as Message];
      });

      // Update conversations cache
      queryClient.setQueryData(['conversations', user?.id, isLandlord], (old: ConversationWithDetails[] = []) => {
        return old.map(conv => 
          conv.id === variables.conversationId
            ? { ...conv, last_message_at: data.created_at, last_message: data.content }
            : conv
        );
      });

      // Mark messages as read for this conversation
      if (activeConversation === variables.conversationId) {
        markMessagesAsRead(variables.conversationId);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message
      });
    }
  });

  // Upload and send attachment mutation
  const sendAttachmentMutation = useMutation({
    mutationFn: async ({ conversationId, content, files }: {
      conversationId: string;
      content: string;
      files: File[];
    }) => {
      if (!user || files.length === 0) throw new Error('No user or files');

      const file = files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(uploadData.path);

      // Send message with attachment
      return sendMessageMutation.mutateAsync({
        conversationId,
        content,
        messageType: 'attachment',
        attachmentUrl: publicUrl
      });
    }
  });

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const userRole = isLandlord ? 'landlord' : 'tenant';
      await supabase.rpc('mark_messages_as_read', {
        conversation_uuid: conversationId,
        user_role: userRole
      });

      // Update local cache
      queryClient.setQueryData(['messages', conversationId], (old: Message[] = []) => {
        return old.map(msg => ({
          ...msg,
          [isLandlord ? 'read_by_landlord' : 'read_by_tenant']: true
        }));
      });

      // Update conversations unread count
      queryClient.setQueryData(['conversations', user.id, isLandlord], (old: ConversationWithDetails[] = []) => {
        return old.map(conv => 
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        );
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [user, isLandlord, queryClient]);

  // User presence management (simplified)
  useEffect(() => {
    if (!user) return;

    let presenceChannel: any;
    
    const setupPresence = () => {
      presenceChannel = supabase.channel('user_presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const online = new Set(Object.keys(state));
          if (isMountedRef.current) {
            setOnlineUsers(online);
          }
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          if (isMountedRef.current) {
            setOnlineUsers(prev => new Set([...prev, key]));
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (isMountedRef.current) {
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
          }
        });

      presenceChannel.subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });
    };

    setupPresence();

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
    };
  }, [user]);

  // Real-time message updates (simplified)
  useEffect(() => {
    if (!user || !activeConversation) return;

    const messageChannel = supabase
      .channel(`messages:${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (isMountedRef.current) {
            queryClient.setQueryData(['messages', activeConversation], (old: Message[] = []) => {
              const exists = old.some(m => m.id === newMessage.id);
              if (exists) return old;
              return [...old, newMessage];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user, activeConversation, queryClient]);

  // Memoized send functions
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    return sendMessageMutation.mutateAsync({ conversationId, content });
  }, [sendMessageMutation]);

  const sendMessageWithAttachment = useCallback(async (conversationId: string, content: string, files: File[]) => {
    return sendAttachmentMutation.mutateAsync({ conversationId, content, files });
  }, [sendAttachmentMutation]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading: conversationsLoading || messagesLoading,
    onlineUsers,
    sendMessage,
    sendMessageWithAttachment,
    fetchMessages: refetchMessages,
    fetchConversations: refetchConversations,
    isLoadingConversations: conversationsLoading,
    isLoadingMessages: messagesLoading,
    isSending: sendMessageMutation.isPending || sendAttachmentMutation.isPending,
    error: conversationsError
  };
}
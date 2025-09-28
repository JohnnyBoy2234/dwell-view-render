import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useWebSocketConnection } from './useWebSocketConnection';
import type { RealtimeMessage, MessageAck } from './useWebSocketConnection';

interface OptimisticMessage extends RealtimeMessage {
  tempId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  profiles?: { display_name: string } | null;
  viewing_proposal_id?: string | null;
}

interface ConversationData {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  status: string;
  last_message_at: string | null;
  properties: {
    title: string;
    images: string[];
  } | null;
  landlord_profile?: { display_name: string } | null;
  tenant_profile?: { display_name: string } | null;
  unread_count?: number;
}

export function useWhatsAppMessaging() {
  const { user, isLandlord } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const messagesCache = useRef<Map<string, OptimisticMessage[]>>(new Map());
  const conversationsCache = useRef<ConversationData[]>([]);
  const pendingMessages = useRef<Map<string, OptimisticMessage>>(new Map());
  
  const {
    connectionStatus,
    onlineUsers,
    typingUsers,
    sendTypingIndicator,
    sendMessageAck,
    registerCallbacks
  } = useWebSocketConnection();

  // Generate unique message ID
  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Load conversations with caching
  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Return cached data immediately if available
      if (conversationsCache.current.length > 0) {
        setConversations(conversationsCache.current);
        setLoading(false);
      }

      console.log('📋 Fetching conversations for user:', user.id);
      
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          *,
          properties (
            title,
            images
          )
        `)
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        conversationsCache.current = [];
        setLoading(false);
        return;
      }

      // Get profiles for all users
      const userIds = new Set<string>();
      conversationsData.forEach(conv => {
        userIds.add(conv.landlord_id);
        userIds.add(conv.tenant_id);
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Calculate unread counts
      const conversationsWithUnread = await Promise.all(
        conversationsData.map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq(isLandlord ? 'read_by_landlord' : 'read_by_tenant', false)
            .neq('sender_id', user.id);

          return {
            ...conv,
            landlord_profile: profileMap.get(conv.landlord_id) || null,
            tenant_profile: profileMap.get(conv.tenant_id) || null,
            unread_count: count || 0
          };
        })
      );

      conversationsCache.current = conversationsWithUnread as ConversationData[];
      setConversations(conversationsWithUnread as ConversationData[]);
      setLoading(false);

      // Cache in localStorage for faster loading
      try {
        localStorage.setItem('messaging_conversations', JSON.stringify(conversationsWithUnread));
      } catch {}

    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      toast({
        variant: "destructive",
        title: "Error loading conversations",
        description: error.message
      });
      setLoading(false);
    }
  }, [user, isLandlord, toast]);

  // Load messages for conversation with caching
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user || !conversationId) return;

    try {
      // Return cached messages immediately if available
      const cached = messagesCache.current.get(conversationId);
      if (cached && cached.length > 0) {
        setMessages(cached);
      }

      console.log('📥 Fetching messages for conversation:', conversationId);
      
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!messagesData) {
        setMessages([]);
        return;
      }

      // Get sender profiles
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform to optimistic messages with correct read status
      const optimisticMessages: OptimisticMessage[] = messagesData.map(msg => {
        const isRead = isLandlord ? msg.read_by_landlord : msg.read_by_tenant;
        return {
          ...msg,
          tempId: msg.id,
          status: isRead ? 'read' : 'delivered',
          profiles: profileMap.get(msg.sender_id) || null
        };
      });

      messagesCache.current.set(conversationId, optimisticMessages);
      setMessages(optimisticMessages);

      // Mark messages as read immediately after loading
      await markMessagesAsRead(conversationId);
      
      // Update messages status to read for messages from other users
      const updatedMessages = optimisticMessages.map(msg => 
        msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
      );
      setMessages(updatedMessages);
      messagesCache.current.set(conversationId, updatedMessages);

      // Cache in localStorage
      try {
        localStorage.setItem(`messaging_messages_${conversationId}`, JSON.stringify(updatedMessages));
      } catch {}

    } catch (error: any) {
      console.error('❌ Error fetching messages:', error);
      toast({
        variant: "destructive",
        title: "Error loading messages",
        description: error.message
      });
    }
  }, [user, toast, isLandlord]);

  // Send message with optimistic update
  const sendMessage = useCallback(async (conversationId: string, content: string, files?: File[]) => {
    if (!user || (!content.trim() && (!files || files.length === 0))) return;

    const tempId = generateTempId();
    const trimmedContent = content.trim();

    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      conversation_id: conversationId,
      sender_id: user.id,
      content: trimmedContent,
      message_type: files && files.length > 0 ? 'attachment' : 'text',
      attachment_url: null,
      created_at: new Date().toISOString(),
      status: 'sending',
      optimistic: true
    };

    // Add to messages immediately (optimistic update)
    setMessages(prev => [...prev, optimisticMessage]);
    pendingMessages.current.set(tempId, optimisticMessage);

    // Update conversation timestamp optimistically
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, last_message_at: new Date().toISOString() }
          : conv
      )
    );

    try {
      let attachmentUrl = null;
      
      // Handle file upload
      if (files && files.length > 0) {
        const file = files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(uploadData.path);

        attachmentUrl = publicUrl;
      }

      // Send to server
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: trimmedContent,
          message_type: attachmentUrl ? 'attachment' : 'text',
          attachment_url: attachmentUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Update optimistic message with real data
      const realMessage: OptimisticMessage = {
        ...data,
        tempId: data.id,
        status: 'sent'
      };

      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? realMessage : msg
        )
      );

      // Update cache
      const cachedMessages = messagesCache.current.get(conversationId) || [];
      const updatedCache = [...cachedMessages.filter(m => m.tempId !== tempId), realMessage];
      messagesCache.current.set(conversationId, updatedCache);

      pendingMessages.current.delete(tempId);

      console.log('✅ Message sent successfully:', data);

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      // Mark as failed
      setMessages(prev => 
        prev.map(msg => 
          msg.tempId === tempId ? { ...msg, status: 'failed' as const } : msg
        )
      );

      toast({
        variant: "destructive",
        title: "Failed to send message",
        description: error.message
      });
    }
  }, [user, toast]);

  // Mark messages as read
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const roleField = isLandlord ? 'read_by_landlord' : 'read_by_tenant';
      
      console.log('📖 Marking messages as read for conversation:', conversationId, 'as', roleField);
      
      const { data, error } = await supabase
        .from('messages')
        .update({ [roleField]: true })
        .eq('conversation_id', conversationId)
        .eq(roleField, false)
        .neq('sender_id', user.id)
        .select('id');

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        return;
      }

      console.log('✅ Marked', data?.length || 0, 'messages as read');

      // Update local message status immediately
      setMessages(prev => prev.map(msg => 
        msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
      ));

      // Update local conversation unread counts
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );

      // Update cache with read status
      const cached = messagesCache.current.get(conversationId);
      if (cached) {
        const updatedCache = cached.map(msg => 
          msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
        );
        messagesCache.current.set(conversationId, updatedCache);
      }

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
    }
  }, [user, isLandlord]);

  // Handle real-time message
  const handleRealtimeMessage = useCallback((message: RealtimeMessage) => {
    console.log('📨 Handling real-time message:', message);
    
    // Check if this is for the active conversation
    if (message.conversation_id === activeConversation) {
      setMessages(prev => {
        // Prevent duplicates - check both id and tempId
        if (prev.some(m => m.id === message.id || m.tempId === message.id)) {
          console.log('🔄 Duplicate message prevented:', message.id);
          return prev;
        }
        
        const optimisticMessage: OptimisticMessage = {
          ...message,
          tempId: message.id,
          status: 'delivered'
        };
        
        console.log('✅ Adding real-time message to active conversation:', optimisticMessage);
        return [...prev, optimisticMessage];
      });

      // Update cache
      const cached = messagesCache.current.get(activeConversation) || [];
      if (!cached.some(m => m.id === message.id || m.tempId === message.id)) {
        const optimisticMessage: OptimisticMessage = {
          ...message,
          tempId: message.id,
          status: 'delivered'
        };
        messagesCache.current.set(activeConversation, [...cached, optimisticMessage]);
      }

      // Send read acknowledgment
      sendMessageAck(message.id, 'read');
    }

    // Update conversation timestamp
    setConversations(prev =>
      prev.map(conv =>
        conv.id === message.conversation_id
          ? { 
              ...conv, 
              last_message_at: message.created_at,
              unread_count: message.conversation_id === activeConversation ? 0 : (conv.unread_count || 0) + 1
            }
          : conv
      )
    );
  }, [activeConversation, sendMessageAck]);

  // Handle message acknowledgments
  const handleMessageAck = useCallback((ack: MessageAck) => {
    console.log('✅ Message ack received:', ack);
    
    setMessages(prev =>
      prev.map(msg =>
        msg.id === ack.messageId || msg.tempId === ack.messageId
          ? { ...msg, status: ack.status }
          : msg
      )
    );
  }, []);

  // Register WebSocket callbacks
  useEffect(() => {
    registerCallbacks({
      onMessage: handleRealtimeMessage,
      onMessageAck: handleMessageAck,
      onUserTyping: (userId, conversationId) => {
        console.log('⌨️ User typing:', userId, conversationId);
      },
      onUserStoppedTyping: (userId) => {
        console.log('⌨️ User stopped typing:', userId);
      },
      onConversationUpdate: (conversationId, data) => {
        console.log('💬 Conversation updated:', conversationId, data);
        fetchConversations(); // Refresh conversations
      }
    });
  }, [registerCallbacks, handleRealtimeMessage, handleMessageAck, fetchConversations]);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (user) {
      try {
        // Load conversations from cache
        const cachedConversations = localStorage.getItem('messaging_conversations');
        if (cachedConversations) {
          const parsed = JSON.parse(cachedConversations);
          setConversations(parsed);
          conversationsCache.current = parsed;
        }
      } catch {}
    }
  }, [user]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    connectionStatus,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendTypingIndicator,
    fetchConversations,
    fetchMessages,
    markMessagesAsRead
  };
}
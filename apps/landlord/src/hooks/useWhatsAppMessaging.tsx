// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@mzanzihomes/supabase/client';
import { useToast } from '@mzanzihomes/ui/hooks/use-toast';
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
  const [typingVersion, setTypingVersion] = useState(0);
  const [localTypingUsers, setLocalTypingUsers] = useState<Map<string, string>>(new Map());
  
  const messagesCache = useRef<Map<string, OptimisticMessage[]>>(new Map());
  const conversationsCache = useRef<ConversationData[]>([]);
  const pendingMessages = useRef<Map<string, OptimisticMessage>>(new Map());
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const {
    connectionStatus,
    onlineUsers,
    typingUsers,
    sendTypingIndicator: coreSendTypingIndicator,
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
      // Pre-load from cache into ref only — do not overwrite state (would erase optimistic messages)
      const cached = messagesCache.current.get(conversationId);
      void cached; // referenced later via messagesCache.current

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

      // Build final server list with read status applied
      const serverMessages: OptimisticMessage[] = optimisticMessages.map(msg =>
        msg.sender_id !== user.id ? { ...msg, status: 'read' as const } : msg
      );

      // Merge: keep any optimistic messages not yet confirmed by the server
      const serverIds = new Set(serverMessages.map(m => m.id));
      setMessages(prev => {
        const pending = prev.filter(m => m.optimistic === true && !serverIds.has(m.id));
        const merged = [...serverMessages, ...pending].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return merged;
      });

      // Mark as read after state is set (fire-and-forget — no await needed)
      markMessagesAsRead(conversationId);

      messagesCache.current.set(conversationId, serverMessages);

      // Cache in localStorage
      try {
        localStorage.setItem(`messaging_messages_${conversationId}`, JSON.stringify(serverMessages));
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

    // Broadcast optimistic message immediately for instant delivery to recipient
    try {
      if (!chatChannelRef.current) {
        chatChannelRef.current = supabase.channel(`chat-${conversationId}`, { config: { broadcast: { self: true } } }).subscribe();
      }
      await chatChannelRef.current.send({ type: 'broadcast', event: 'new_message', payload: { ...optimisticMessage } });
    } catch (e) {
      console.warn('Broadcast optimistic new_message failed', e);
    }

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

      // Broadcast real message to replace optimistic on recipient
      try {
        if (!chatChannelRef.current) {
          chatChannelRef.current = supabase.channel(`chat-${conversationId}`, { config: { broadcast: { self: true } } }).subscribe();
        }
        await chatChannelRef.current.send({ type: 'broadcast', event: 'new_message', payload: { ...realMessage, tempId } });
      } catch (e) {
        console.warn('Broadcast new_message failed', e);
      }

      // Also notify globally for unread badge updates
      try {
        if (!globalChannelRef.current) {
          globalChannelRef.current = supabase.channel('global-messages', { config: { broadcast: { self: true } } }).subscribe();
        }
        await globalChannelRef.current.send({ type: 'broadcast', event: 'new_message', payload: { conversation_id: conversationId, message_id: (data as any).id, sender_id: user.id } });
      } catch (e) {
        console.warn('Broadcast global new_message failed', e);
      }

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

  // Mark messages as read with detailed logging
  const markMessagesAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    console.log('📖 [WHATSAPP READ] Starting mark as read for conversation:', conversationId, 'user role:', isLandlord ? 'landlord' : 'tenant');

    try {
      const roleField = isLandlord ? 'read_by_landlord' : 'read_by_tenant';
      
      console.log('📖 [WHATSAPP READ] Updating field:', roleField, 'for conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('messages')
        .update({ [roleField]: true })
        .eq('conversation_id', conversationId)
        .eq(roleField, false)
        .neq('sender_id', user.id)
        .select('id');

      if (error) {
        console.error('❌ [WHATSAPP READ] Direct update error:', error);
        
        // Try using the RPC function as fallback
        console.log('📖 [WHATSAPP READ] Trying RPC function as fallback...');
        const { error: rpcError } = await supabase.rpc('mark_messages_as_read', {
          conversation_uuid: conversationId,
          user_role: isLandlord ? 'landlord' : 'tenant'
        });
        
        if (rpcError) {
          console.error('❌ [WHATSAPP READ] RPC fallback also failed:', rpcError);
          return;
        }
        console.log('✅ [WHATSAPP READ] RPC fallback succeeded');
      } else {
        console.log('✅ [WHATSAPP READ] Direct update succeeded, marked', data?.length || 0, 'messages as read');
      }

      // Verify the update worked
      const { data: verifyData, error: verifyError } = await supabase
        .from('messages')
        .select('id, sender_id, read_by_landlord, read_by_tenant')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq(roleField, false)
        .limit(3);

      if (verifyError) {
        console.error('❌ [WHATSAPP READ] Verification failed:', verifyError);
      } else {
        console.log('🔍 [WHATSAPP READ] Remaining unread messages:', verifyData?.length || 0, verifyData);
      }

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

      // Broadcast read receipts to the other participant for instant status update
      try {
        const updatedIds = (data || []).map((d: any) => d.id);
        if (updatedIds.length > 0) {
          if (!chatChannelRef.current) {
            chatChannelRef.current = supabase.channel(`chat-${conversationId}`, { config: { broadcast: { self: true } } }).subscribe();
          }
          await chatChannelRef.current.send({ type: 'broadcast', event: 'read_receipt', payload: { messageIds: updatedIds } });
        }
      } catch (e) {
        console.warn('Broadcast read_receipt failed', e);
      }

    } catch (error) {
      console.error('❌ [WHATSAPP READ] Unexpected error:', error);
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
      onUserTyping: (_userId, _conversationId) => {
        // Connection hook maintains typingUsers state; bump version to re-render
        setTypingVersion(v => v + 1);
      },
      onUserStoppedTyping: (_userId) => {
        setTypingVersion(v => v + 1);
      },
      onConversationUpdate: (conversationId, data) => {
        console.log('💬 Conversation updated:', conversationId, data);
        fetchConversations(); // Refresh conversations
      }
    });
  }, [registerCallbacks, handleRealtimeMessage, handleMessageAck, fetchConversations]);

  // Subscribe to a global broadcast channel so other surfaces (e.g., bottom bar) can react instantly
  useEffect(() => {
    try {
      if (!globalChannelRef.current) {
        globalChannelRef.current = supabase.channel('global-messages', { config: { broadcast: { self: true } } }).subscribe();
      }
    } catch (e) {
      console.warn('Failed to join global-messages channel', e);
    }
    return () => {
      if (globalChannelRef.current) {
        supabase.removeChannel(globalChannelRef.current);
        globalChannelRef.current = null;
      }
    };
  }, []);

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
      // Join conversation broadcast channel for instant delivery and typing/read signals
      try {
        if (chatChannelRef.current) {
          supabase.removeChannel(chatChannelRef.current);
          chatChannelRef.current = null;
        }
        const channel = supabase.channel(`chat-${activeConversation}`, {
          config: { broadcast: { self: true } }
        });
        channel
          .on('broadcast', { event: 'new_message' }, ({ payload }) => {
            const msg = payload as any;
            if (!msg || msg.conversation_id !== activeConversation) return;
            setMessages(prev => {
              // Case 1: Self-broadcast of our own optimistic message (tempId === id).
              // We already inserted it on send — update status in-place, never remove.
              if (msg.tempId === msg.id) {
                if (prev.some(m => m.tempId === msg.tempId)) {
                  return prev.map(m =>
                    m.tempId === msg.tempId ? { ...m, status: 'delivered' as const } : m
                  );
                }
                return prev;
              }
              // Case 2: Server confirmation broadcast (real id + tempId reference).
              // Replace the optimistic entry with the confirmed message.
              if (msg.tempId) {
                const withoutTemp = prev.filter(m => m.tempId !== msg.tempId);
                if (withoutTemp.some(m => m.id === msg.id)) return withoutTemp; // already present
                const delivered: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
                return [...withoutTemp, delivered];
              }
              // Case 3: Message from the other user — add if not already present.
              if (prev.some(m => m.id === msg.id || m.tempId === msg.id)) return prev;
              const optimistic: OptimisticMessage = { ...msg, tempId: msg.id, status: 'delivered' };
              return [...prev, optimistic];
            });
            const cached = messagesCache.current.get(activeConversation) || [];
            const msgId = (msg as any).id;
            const msgTempId = (msg as any).tempId;
            if (!cached.some(m => m.id === msgId || m.tempId === msgId || (msgTempId && m.tempId === msgTempId))) {
              messagesCache.current.set(activeConversation, [...cached, { ...msg, tempId: msgId, status: 'delivered' }]);
            }
          })
          .on('broadcast', { event: 'typing' }, ({ payload }) => {
            // Normalize payload keys from different sources
            const { userId, user_id, typing, conversationId, conversation_id } = payload as any;
            const cid = conversationId || conversation_id;
            if (cid !== activeConversation) return;
            const uid = userId || user_id;
            if (!uid || uid === user?.id) return;
            setLocalTypingUsers(prev => {
              const next = new Map(prev);
              if (typing) {
                next.set(uid, cid);
              } else {
                next.delete(uid);
              }
              return next;
            });
            setTypingVersion(v => v + 1);
          })
          .on('broadcast', { event: 'read_receipt' }, ({ payload }) => {
            const { messageIds } = payload as any;
            if (!Array.isArray(messageIds) || messageIds.length === 0) return;
            setMessages(prev => prev.map(m => (messageIds.includes(m.id) ? { ...m, status: 'read' as const } : m)));
          })
          .subscribe();
        chatChannelRef.current = channel;
      } catch (e) {
        console.warn('Failed to join chat channel', e);
      }
    } else {
      setMessages([]);
      setLocalTypingUsers(new Map());
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
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

  // Merge core typing users with local per-conversation typing
  const mergedTypingUsers = (() => {
    const merged = new Map(typingUsers);
    localTypingUsers.forEach((value, key) => merged.set(key, value));
    return merged;
  })();

  // Unified typing indicator sender: send via unified channel and per-conversation channel
  const sendTypingIndicator = useCallback((conversationId: string, typing: boolean) => {
    try {
      coreSendTypingIndicator(conversationId, typing);
    } catch {}
    try {
      if (!chatChannelRef.current || (chatChannelRef.current as any).topic !== `realtime:chat-${conversationId}`) {
        chatChannelRef.current = supabase.channel(`chat-${conversationId}`, { config: { broadcast: { self: true } } }).subscribe();
      }
      chatChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: user?.id, conversation_id: conversationId, typing } });
    } catch (e) {
      console.warn('Broadcast typing failed', e);
    }
  }, [coreSendTypingIndicator, user]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    connectionStatus,
    onlineUsers,
    typingUsers: mergedTypingUsers,
    sendMessage,
    sendTypingIndicator,
    fetchConversations,
    fetchMessages,
    markMessagesAsRead
  };
}
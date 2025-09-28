import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtime } from './useRealtime';

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
  viewing_proposal_id?: string | null;
  profiles?: {
    display_name: string;
  } | null;
}

interface Conversation {
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
  landlord_profile?: {
    display_name: string;
  } | null;
  tenant_profile?: {
    display_name: string;
  } | null;
  unread_count?: number;
}

export function useMessaging(onViewingProposalChange?: () => void) {
  const { user, isLandlord } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const hasHydratedFromCacheRef = useRef(false);
  const messageChannelRef = useRef<any | null>(null);

  // Component mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update user presence
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      if (!isMountedRef.current) return;
      await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          is_online: true,
          last_seen: new Date().toISOString()
        });
    };

    updatePresence();

    // Update presence every 30 seconds
    const interval = setInterval(updatePresence, 30000);

    // Set offline when page unloads
    const handleUnload = async () => {
      await supabase
        .from('user_presence')
        .update({
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('user_id', user.id);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload();
    };
  }, [user]);

  // Subscribe to online users
  useEffect(() => {
    const channel = supabase
      .channel('user-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const presence = payload.new as any;
            if (!isMountedRef.current) return;
            setOnlineUsers(prev => {
              const newSet = new Set(prev);
              if (presence.is_online) {
                newSet.add(presence.user_id);
              } else {
                newSet.delete(presence.user_id);
              }
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch conversations
  const fetchConversations = async () => {
    if (!user) {
      console.log('❌ Cannot fetch conversations: no user');
      setLoading(false);
      return;
    }

    console.log('📋 Fetching conversations for user:', user.id);

    try {
      setLoading(true);
      // First fetch conversations with property data
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

      if (conversationsError) {
        console.error('❌ Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      console.log('📋 Fetched conversations:', conversationsData?.length || 0, 'conversations');

      if (!conversationsData || conversationsData.length === 0) {
        if (!isMountedRef.current) {
          setLoading(false);
          return;
        }
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs for profile fetching
      const userIds = new Set<string>();
      conversationsData.forEach(conv => {
        userIds.add(conv.landlord_id);
        userIds.add(conv.tenant_id);
      });

      // Fetch all profiles at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', Array.from(userIds));

      if (profilesError) {
        console.warn('Could not fetch user profiles:', profilesError);
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Calculate unread counts and combine with profile data
      const conversationsWithUnread = await Promise.all(
        conversationsData.map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq(isLandlord ? 'read_by_landlord' : 'read_by_tenant', false)
            .neq('sender_id', user.id); // Don't count messages sent by current user

          return {
            ...conv,
            landlord_profile: profileMap.get(conv.landlord_id) || null,
            tenant_profile: profileMap.get(conv.tenant_id) || null,
            unread_count: count || 0
          };
        })
      );

      if (!isMountedRef.current) return;
      setConversations(conversationsWithUnread as any);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading conversations",
        description: error.message
      });
      setLoading(false);
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    console.log('📥 Fetching messages for conversation:', conversationId);
    try {
      setLoading(true);
      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError);
        throw messagesError;
      }

      console.log('📥 Fetched messages:', messagesData?.length || 0, 'messages');

      if (!messagesData || messagesData.length === 0) {
        console.log('📥 No messages found for conversation');
        if (!isMountedRef.current) return;
        setMessages([]);
        setLoading(false);
        return;
      }

      // Get unique sender IDs for profile fetching
      const senderIds = [...new Set(messagesData.map(msg => msg.sender_id))];

      // Fetch profiles for senders
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      if (profilesError) {
        console.warn('Could not fetch sender profiles:', profilesError);
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Combine messages with profile data
      const messagesWithProfiles = messagesData.map(message => ({
        ...message,
        profiles: profileMap.get(message.sender_id) || null
      }));

      if (!isMountedRef.current) return;
      setMessages(messagesWithProfiles as any);

      // Mark messages as read
      await markMessagesAsRead(conversationId);
      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading messages",
        description: error.message
      });
      setLoading(false);
    }
  }, [toast, isLandlord]);

  // Send a message
  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) {
      console.log('❌ Cannot send message: missing user or content', { user: !!user, content: content.trim() });
      return;
    }

    console.log('📤 Sending message:', { conversationId, content: content.trim(), senderId: user.id });

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }

      console.log('✅ Message sent successfully:', data);

      // Optimistically append for instant UI; realtime will reconcile
      if (isMountedRef.current && activeConversation === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === (data as any).id)) return prev;
          return [...prev, data as any];
        });
      }
      fetchConversations();
    } catch (error: any) {
      console.error('❌ Final error in sendMessage:', error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message
      });
    }
  };

  // Send a message with attachment
  const sendMessageWithAttachment = async (conversationId: string, content: string, files: File[] = []) => {
    if (!user || (!content.trim() && files.length === 0)) {
      console.log('❌ Cannot send message: missing user or content/files');
      return;
    }

    console.log('📤 Sending message with attachments:', { conversationId, content: content.trim(), files: files.length, senderId: user.id });

    try {
      let attachmentUrl = null;
      let messageType = 'text';

      // Upload file if provided
      if (files.length > 0) {
        const file = files[0]; // For now, handle single file
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        console.log('📎 Uploading file:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('❌ Error uploading file:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(uploadData.path);

        attachmentUrl = publicUrl;
        messageType = 'attachment';
        console.log('✅ File uploaded successfully:', attachmentUrl);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim() || '',
          message_type: messageType,
          attachment_url: attachmentUrl
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }

      console.log('✅ Message with attachment sent successfully:', data);

      // Optimistically append for instant UI; realtime will reconcile
      if (isMountedRef.current && activeConversation === conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === (data as any).id)) return prev;
          return [...prev, data as any];
        });
      }
      fetchConversations();
    } catch (error: any) {
      console.error('❌ Final error in sendMessageWithAttachment:', error);
      toast({
        variant: "destructive",
        title: "Error sending message",
        description: error.message
      });
    }
  };

  // Create a new conversation
  const createConversation = async (propertyId: string, landlordId: string, tenantId: string, inquiryId?: string) => {
    if (!user) return null;

    console.log('🚀 Creating conversation:', { propertyId, landlordId, tenantId, inquiryId, userId: user.id });

    try {
      // First check if conversation already exists
      const { data: existing, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .eq('property_id', propertyId)
        .eq('landlord_id', landlordId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error checking existing conversation:', checkError);
        throw checkError;
      }

      if (existing) {
        console.log('✅ Found existing conversation:', existing.id);
        return existing;
      }

      // Create new conversation
      console.log('🆕 Creating new conversation...');
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          property_id: propertyId,
          landlord_id: landlordId,
          tenant_id: tenantId,
          inquiry_id: inquiryId
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating conversation:', error);
        
        // If conversation already exists due to race condition, try to fetch it again
        if (error.code === '23505') {
          console.log('🔄 Duplicate detected, fetching existing...');
          const { data: duplicate, error: dupError } = await supabase
            .from('conversations')
            .select('*')
            .eq('property_id', propertyId)
            .eq('landlord_id', landlordId)
            .eq('tenant_id', tenantId)
            .single();
          
          if (dupError) {
            console.error('❌ Error fetching duplicate:', dupError);
            throw dupError;
          }
          
          console.log('✅ Found duplicate conversation:', duplicate.id);
          return duplicate;
        }
        throw error;
      }

      console.log('✅ Successfully created conversation:', data.id);
      if (!isMountedRef.current) return data;
      fetchConversations();
      return data;
    } catch (error: any) {
      console.error('❌ Final error in createConversation:', error);
      toast({
        variant: "destructive",
        title: "Error creating conversation",
        description: error.message
      });
      return null;
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_messages_as_read', {
        conversation_uuid: conversationId,
        user_role: isLandlord ? 'landlord' : 'tenant'
      });

      if (error) throw error;

      // Update local state
      if (!isMountedRef.current) return;
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error: any) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Global realtime: keep conversation list fresh (messages handled by scoped channel)
  useRealtime({
    onMessageChange: () => {
      if (!isMountedRef.current) return;
      fetchConversations();
    },
    onViewingProposalChange: () => {
      if (!isMountedRef.current) return;
      if (onViewingProposalChange) onViewingProposalChange();
      fetchConversations();
    }
  });

  // Load conversations on mount
  useEffect(() => {
    if (!user) return;

    // 1) Hydrate from local cache instantly (warm load)
    try {
      const cacheKey = `sr_conversations_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setConversations(parsed as any);
          hasHydratedFromCacheRef.current = true;
        } else if (Array.isArray(parsed?.items)) {
          setConversations(parsed.items as any);
          hasHydratedFromCacheRef.current = true;
        }
      }
      // Restore last active conversation if present (and no URL param set elsewhere)
      const lastKey = `sr_active_conv_${user.id}`;
      const last = localStorage.getItem(lastKey);
      if (last && !activeConversation) {
        setActiveConversation(last);
      }
    } catch (e) {
      // Ignore cache errors
    }

    // 2) Always refresh from server
    fetchConversations();
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation) return;

    fetchMessages(activeConversation);

    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`
        },
        async (payload) => {
          if (!isMountedRef.current) return;
          if (payload.eventType === 'INSERT') {
            const message = payload.new as Message;
            setMessages(prev => (prev.some(m => m.id === message.id) ? prev : [...prev, message]));
          } else if (payload.eventType === 'UPDATE') {
            const message = payload.new as Message;
            setMessages(prev => prev.map(m => (m.id === message.id ? { ...m, ...message } : m)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation]);

  // Persist conversations to cache after refresh
  useEffect(() => {
    if (!user) return;
    try {
      const cacheKey = `sr_conversations_${user.id}`;
      localStorage.setItem(cacheKey, JSON.stringify(conversations));
    } catch {}
  }, [user, conversations]);

  // Persist last active conversation
  useEffect(() => {
    if (!user || !activeConversation) return;
    try {
      const lastKey = `sr_active_conv_${user.id}`;
      localStorage.setItem(lastKey, activeConversation);
    } catch {}
  }, [user, activeConversation]);

  // Per-conversation realtime channel for instant message updates
  useEffect(() => {
    if (messageChannelRef.current) {
      supabase.removeChannel(messageChannelRef.current);
      messageChannelRef.current = null;
    }
    if (!activeConversation) return;

    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConversation}` },
        (payload) => {
          if (!isMountedRef.current) return;
          try {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as any as Message;
              setMessages(prev => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any as Message;
              setMessages(prev => prev.map(m => (m.id === updated.id ? { ...m, ...updated } : m)));
            } else if (payload.eventType === 'DELETE') {
              const oldRow: any = payload.old;
              setMessages(prev => prev.filter(m => m.id !== oldRow.id));
            }
          } catch (e) {
            console.error('Realtime message handler error:', e);
          }
        }
      )
      .subscribe();

    messageChannelRef.current = channel;
    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, [activeConversation]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage,
    sendMessageWithAttachment,
    createConversation,
    fetchConversations,
    fetchMessages,
    markMessagesAsRead
  };
}
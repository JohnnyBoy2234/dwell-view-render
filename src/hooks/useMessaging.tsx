import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// import { useRealtime } from './useRealtime';

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
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Update user presence
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
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
    if (!user) return;

    try {
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

      if (conversationsError) throw conversationsError;

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
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

      setConversations(conversationsWithUnread as any);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading conversations",
        description: error.message
      });
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (conversationId: string) => {
    setLoading(true);
    try {
      // First fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messagesData || messagesData.length === 0) {
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

      setMessages(messagesWithProfiles as any);

      // Mark messages as read
      await markMessagesAsRead(conversationId);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading messages",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Send a message
  const sendMessage = async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) throw error;
    } catch (error: any) {
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

  // Temporarily disabled real-time subscriptions to fix initialization error
  // useRealtime({
  //   onMessageChange: () => {
  //     console.log('🔄 Refreshing messages due to real-time update');
  //     if (activeConversation) {
  //       fetchMessages(activeConversation);
  //     }
  //     fetchConversations();
  //   },
  //   onViewingProposalChange: () => {
  //     console.log('🔄 Refreshing viewing proposals due to real-time update');
  //     if (onViewingProposalChange) {
  //       onViewingProposalChange();
  //     }
  //     fetchConversations();
  //   }
  // });

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage,
    createConversation,
    fetchConversations,
    fetchMessages,
    markMessagesAsRead
  };
}
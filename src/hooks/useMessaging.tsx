import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealtime } from './useRealtime';

type MessageType = 'text' | 'attachment' | 'system' | 'proposal';
type ConversationStatus = 'active' | 'archived' | 'pending' | 'blocked';

interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
}

interface PropertyDetails {
  id: string;
  title: string;
  images: string[];
  address?: string;
  rent_amount?: number;
  currency?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_url: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  read_by_landlord: boolean;
  read_by_tenant: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  viewing_proposal_id?: string | null;
  profiles?: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
  metadata?: Record<string, unknown>;
}

interface Conversation {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  inquiry_id?: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  properties: {
    id: string;
    title: string;
    images: string[];
    address?: string;
    rent_amount?: number;
    currency?: string;
  } | null;
  landlord_profile?: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
  tenant_profile?: Pick<UserProfile, 'display_name' | 'avatar_url'> | null;
  unread_count?: number;
  last_message?: Pick<Message, 'id' | 'content' | 'message_type' | 'created_at' | 'sender_id'> | null;
  metadata?: Record<string, unknown>;
}

interface SendMessageParams {
  conversationId: string;
  content: string;
  messageType?: MessageType;
  attachment?: File;
  metadata?: Record<string, unknown>;
}

interface CreateConversationParams {
  propertyId: string;
  landlordId: string;
  tenantId: string;
  inquiryId?: string;
  initialMessage?: string;
  metadata?: Record<string, unknown>;
}

interface UseMessagingReturn {
  conversations: Conversation[];
  activeConversation: string | null;
  setActiveConversation: (conversationId: string | null) => void;
  messages: Message[];
  loading: boolean;
  onlineUsers: Set<string>;
  sendMessage: (params: SendMessageParams) => Promise<void>;
  sendMessageWithAttachment: (params: SendMessageParams & { files: File[] }) => Promise<void>;
  createConversation: (params: CreateConversationParams) => Promise<Conversation | null>;
  fetchConversations: () => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  markMessagesAsRead: (conversationId: string) => Promise<void>;
  isUserOnline: (userId: string) => boolean;
}

// Type guards
const isMessage = (data: unknown): data is Message => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'conversation_id' in data &&
    'sender_id' in data &&
    'content' in data
  );
};

const isConversation = (data: unknown): data is Conversation => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'property_id' in data &&
    'landlord_id' in data &&
    'tenant_id' in data
  );
};

// Error handling
class MessagingError extends Error {
  code: string;
  details?: unknown;
  
  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'MessagingError';
    this.code = code;
    this.details = details;
  }
}

// Constants
const MESSAGE_PAGE_SIZE = 50;
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useMessaging(onViewingProposalChange?: () => void): UseMessagingReturn {
  const { user, isLandlord } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  
  const { toast } = useToast();
  const isMountedRef = useRef<boolean>(true);
  const hasHydratedFromCacheRef = useRef<boolean>(false);
  const messageChannelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedRef = useRef<Record<string, number>>({});
  
  // Memoize user ID to prevent unnecessary effect re-runs
  const userId = useMemo(() => user?.id, [user?.id]);

  // Component mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Memoize the current user's ID to prevent unnecessary effect re-runs
  const currentUserId = useMemo(() => user?.id, [user?.id]);

  // Memoize the isLandlord value to prevent unnecessary effect re-runs
  const currentUserIsLandlord = useMemo(() => isLandlord, [isLandlord]);

  // Memoize the toast function
  const showToast = useCallback((title: string, description: string, variant: 'default' | 'destructive' = 'destructive') => {
    toast({ title, description, variant });
  }, [toast]);

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

  /**
   * Fetches all conversations for the current user
   * @throws {MessagingError} If fetching conversations fails
   */
  const fetchConversations = useCallback(async (): Promise<void> => {
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
  }, [user, isLandlord, toast]);

  /**
   * Marks all messages in a conversation as read for the current user
   * @param conversationId - ID of the conversation to mark as read
   * @throws {MessagingError} If marking messages as read fails
   */
  const markMessagesAsRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!userId) {
      console.warn('Cannot mark messages as read: No user ID');
      return;
    }

    if (!conversationId) {
      console.warn('Cannot mark messages as read: No conversation ID');
      return;
    }

    console.log('📖 Marking messages as read for conversation:', conversationId, 
      'role:', isLandlord ? 'landlord' : 'tenant');

    // Optimistic update
    const previousConversations = conversations;
    if (isMountedRef.current) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    }

    try {
      const { error, data } = await supabase.rpc('mark_messages_as_read', {
        conversation_uuid: conversationId,
        user_role: isLandlord ? 'landlord' : 'tenant'
      });

      if (error) {
        console.error('❌ RPC function error:', error);
        throw new MessagingError(
          error.message || 'Failed to mark messages as read',
          error.code || 'MARK_READ_FAILED',
          { details: error.details }
        );
      }

      console.log('✅ Messages marked as read successfully:', data);

      // Verify the update if in development
      if (process.env.NODE_ENV === 'development') {
        const { data: verifyMessages } = await supabase
          .from('messages')
          .select('id, sender_id, read_by_landlord, read_by_tenant')
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .limit(5);

        if (verifyMessages) {
          const readField = isLandlord ? 'read_by_landlord' : 'read_by_tenant';
          const unreadCount = verifyMessages.filter(m => !m[readField]).length;
          console.log('🔍 Verification - remaining unread messages:', unreadCount);
        }
      }

      // Notify other components about the read status change
      window.dispatchEvent(new CustomEvent('messages-marked-read', { 
        detail: { conversationId } 
      }));
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      
      // Revert optimistic update on error
      if (isMountedRef.current) {
        setConversations(previousConversations);
      }

      const errorMessage = error instanceof MessagingError
        ? error.message
        : 'An unexpected error occurred while marking messages as read';
      
      toast({
        variant: 'destructive',
        title: 'Failed to mark messages as read',
        description: errorMessage,
      });
      
      // Re-throw for error boundaries or callers to handle
      throw error;
    }
  }, [userId, isLandlord, conversations, toast]);

  /**
   * Fetches messages for a specific conversation
   * @param conversationId - ID of the conversation to fetch messages for
   * @throws {MessagingError} If fetching messages fails
   */
  const fetchMessages = useCallback(async (conversationId: string): Promise<void> => {
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
      setMessages(messagesWithProfiles as Message[]);
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
  }, [userId, markMessagesAsRead, toast]);

  /**
   * Updates the last message of a conversation in the local state
   */
  const updateConversationLastMessage = useCallback((
    conversationId: string,
    content: string,
    messageType: MessageType = 'text'
  ) => {
    if (!isMountedRef.current || !userId) return;
    
    setConversations(prev => {
      const now = new Date().toISOString();
      return prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message_at: now,
            last_message: {
              id: `temp-${Date.now()}`,
              content: content.length > 100 ? `${content.substring(0, 100)}...` : content,
              message_type: messageType,
              created_at: now,
              sender_id: userId
            }
          };
        }
        return conv;
      });
    });
  }, [userId]);

  // Real-time subscription for conversation updates (last_message_at)
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('conversation-updates');

    // Subscribe to both landlord and tenant scoped updates separately (or(...) is not supported in filter)
    const onConversationChange = (payload: any) => {
      if (!isMountedRef.current) return;
      console.log('📋 Conversation change received:', payload);
      const updatedConv = payload.new as any;
      setConversations(prev =>
        prev.map(conv =>
          conv.id === updatedConv.id
            ? { ...conv, last_message_at: updatedConv.last_message_at }
            : conv
        )
      );
    };

    channel
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `landlord_id=eq.${user.id}`
      }, onConversationChange)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `tenant_id=eq.${user.id}`
      }, onConversationChange)
      // Also listen for new conversations you're part of
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `landlord_id=eq.${user.id}`
      }, () => fetchConversations())
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
        filter: `tenant_id=eq.${user.id}`
      }, () => fetchConversations())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'viewing_proposals'
      }, () => {
        if (!isMountedRef.current) return;
        if (onViewingProposalChange) onViewingProposalChange();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onViewingProposalChange]);

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

    console.log('🔄 Loading messages for conversation:', activeConversation);
    fetchMessages(activeConversation);

    // Auto-mark messages as read when conversation becomes active and visible
    const markAsReadInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !document.hidden) {
        console.log('🔄 Auto-marking messages as read for active conversation:', activeConversation);
        markMessagesAsRead(activeConversation);
      }
    }, 3000); // Check every 3 seconds

    // Single real-time subscription for messages + watchdog
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation}`
        },
        async (payload) => {
          if (!isMountedRef.current) return;
          
          console.log('💬 Real-time message update:', payload.eventType, payload);
          
          try {
            if (payload.eventType === 'INSERT') {
              const newMessage = payload.new as Message;
              
              // Fetch sender profile if not already loaded
              if (newMessage.sender_id && !newMessage.profiles) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('user_id, display_name')
                  .eq('user_id', newMessage.sender_id)
                  .single();
                
                if (profile) {
                  newMessage.profiles = { display_name: profile.display_name };
                }
              }
              
              setMessages(prev => {
                // Deduplication: check if message already exists
                if (prev.some(m => m.id === newMessage.id)) {
                  console.log('📝 Message already exists, skipping duplicate');
                  return prev;
                }
                console.log('📝 Adding new real-time message');
                return [...prev, newMessage];
              });

              // Auto-mark new messages as read if user is viewing the conversation
              if (newMessage.sender_id !== user?.id && document.visibilityState === 'visible') {
                console.log('📖 Auto-marking new message as read since user is viewing conversation');
                setTimeout(() => markMessagesAsRead(activeConversation), 1000);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedMessage = payload.new as Message;
              setMessages(prev => 
                prev.map(m => m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m)
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedMessage = payload.old as Message;
              setMessages(prev => prev.filter(m => m.id !== deletedMessage.id));
            }
          } catch (error) {
            console.error('Error processing real-time message update:', error);
          }
        }
      )
      .subscribe();

    // Watchdog: if no realtime for a while, poll as a fallback
    let lastRealtimeAt = Date.now();
    const origHandler = (channel as any).bindings?.[0]?.callback;
    // This is defensive; if structure differs, we still poll
    const pollInterval = setInterval(() => {
      const elapsed = Date.now() - lastRealtimeAt;
      if (elapsed > 8000) {
        console.log('⏱️ Realtime quiet for >8s, polling messages as fallback');
        fetchMessages(activeConversation);
        lastRealtimeAt = Date.now();
      }
    }, 5000);

    return () => {
      console.log('🧹 Cleaning up messages channel for:', activeConversation);
      clearInterval(markAsReadInterval);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeConversation, markMessagesAsRead, user]);

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

  // Cleanup message channel ref on unmount
  useEffect(() => {
    return () => {
      if (messageChannelRef.current) {
        supabase.removeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      // Clear any pending timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  // Helper function to check if a user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Return the public API of the hook
  return useMemo(() => ({
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    sendMessage: async (params: SendMessageParams) => {
      try {
        await supabase
          .from('messages')
          .insert({
            conversation_id: params.conversationId,
            sender_id: user?.id,
            content: params.content,
            message_type: params.messageType || 'text',
            attachment_url: params.attachment ? URL.createObjectURL(params.attachment) : null,
            attachment_type: params.attachment ? params.attachment.type : null,
            attachment_name: params.attachment ? params.attachment.name : null,
            attachment_size: params.attachment ? params.attachment.size : null,
            metadata: params.metadata
          });
        updateConversationLastMessage(params.conversationId, params.content, params.messageType);
      } catch (error) {
        console.error('Failed to send message:', error);
        throw error;
      }
    },
    sendMessageWithAttachment: async (params: SendMessageParams & { files: File[] }) => {
      try {
        await supabase
          .from('messages')
          .insert({
            conversation_id: params.conversationId,
            sender_id: user?.id,
            content: params.content,
            message_type: 'attachment',
            attachment_url: URL.createObjectURL(params.files[0]),
            attachment_type: params.files[0].type,
            attachment_name: params.files[0].name,
            attachment_size: params.files[0].size,
            metadata: params.metadata
          });
        updateConversationLastMessage(params.conversationId, params.content, 'attachment');
      } catch (error) {
        console.error('Failed to send message with attachment:', error);
        throw error;
      }
    },
    createConversation: async (params: CreateConversationParams) => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            property_id: params.propertyId,
            landlord_id: params.landlordId,
            tenant_id: params.tenantId,
            inquiry_id: params.inquiryId,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, property_id, landlord_id, tenant_id, inquiry_id, status, created_at, updated_at')
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          throw error;
        }

        if (params.initialMessage) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: data.id,
              sender_id: user?.id,
              content: params.initialMessage,
              message_type: 'text',
              created_at: new Date().toISOString()
            });
        }

        // Cast to Conversation type with default values for missing properties
        return {
          ...data,
          last_message_at: data.created_at,
          properties: null,
          landlord_profile: null,
          tenant_profile: null,
          unread_count: 0,
          last_message: null
        } as Conversation;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        throw error;
      }
    },
    fetchConversations,
    fetchMessages,
    markMessagesAsRead,
    isUserOnline
  }), [
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    loading,
    onlineUsers,
    user,
    updateConversationLastMessage,
    supabase,
    fetchConversations,
    fetchMessages,
    markMessagesAsRead,
    isUserOnline
  ]);
}
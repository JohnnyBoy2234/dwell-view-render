import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@supabase/supabase-js';

type ConnectionStatusType = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface PresencePayload {
  user_id: string;
  online_at: string;
  [key: string]: unknown;
}

type PresenceEvent = 'sync' | 'join' | 'leave';

type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

type SubscriptionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED';

interface BroadcastPayload {
  user_id: string;
  conversation_id: string;
  typing: boolean;
}

export interface TypingUser {
  userId: string;
  conversationId: string;
  lastTypingEvent: Date;
}

export interface ConnectionStatus {
  status: ConnectionStatusType;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageAck {
  messageId: string;
  status: MessageStatus;
  timestamp: string;
  conversationId?: string;
  recipientId?: string;
}

export type MessageType = 'text' | 'image' | 'document' | 'system' | 'proposal' | 'payment';

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_type?: string | null;
  created_at: string;
  updated_at?: string;
  delivered_at?: string | null;
  read_at?: string | null;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  optimistic?: boolean;
  tempId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  viewing_proposal_id?: string | null;
  reply_to_message_id?: string | null;
}

type WebSocketMessageType = 
  | 'message_sent' 
  | 'message_delivered' 
  | 'message_read' 
  | 'user_typing' 
  | 'user_online' 
  | 'user_offline' 
  | 'conversation_update'
  | 'presence_update';

interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  messageId?: string;
  conversationId?: string;
  senderId?: string;
}

interface TypingIndicatorPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  timestamp: string;
}

interface ConversationUpdatePayload {
  id: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  status?: 'active' | 'archived' | 'blocked';
  updated_at: string;
}

export function useWebSocketConnection() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  
  // Refs for managing connection state
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);
  const lastTypingEventRef = useRef<Map<string, number>>(new Map());
  
  // Callback types for message handling
  interface WebSocketCallbacks {
    onMessage?: (message: RealtimeMessage) => void;
    onMessageAck?: (ack: MessageAck) => void;
    onUserTyping?: (userId: string, conversationId: string) => void;
    onUserStoppedTyping?: (userId: string) => void;
    onConversationUpdate?: (conversationId: string, data: ConversationUpdatePayload) => void;
    onConnectionStatusChange?: (status: ConnectionStatus) => void;
    onPresenceUpdate?: (onlineUsers: Set<string>) => void;
  }
  
  const callbacksRef = useRef<WebSocketCallbacks>({});

  const updateConnectionStatus = useCallback((status: ConnectionStatusType, error?: string) => {
    const newStatus: ConnectionStatus = {
      ...connectionStatus,
      status,
      lastConnected: status === 'connected' ? new Date() : connectionStatus.lastConnected,
      error: error || connectionStatus.error
    };
    
    setConnectionStatus(newStatus);
    callbacksRef.current.onConnectionStatusChange?.(newStatus);
  }, [connectionStatus]);

  const handlePresenceSync = useCallback((state: Record<string, PresencePayload[]>) => {
    const online = new Set<string>();
    
    Object.values(state || {}).forEach((presences) => {
      presences.forEach((presence) => {
        if (presence.user_id) {
          online.add(presence.user_id);
        }
      });
    });
    
    setOnlineUsers(online);
    callbacksRef.current.onPresenceUpdate?.(online);
  }, []);

  const handlePresenceJoin = useCallback(({ key, newPresences }: { key: string, newPresences: PresencePayload[] }) => {
    console.log('👋 User joined:', key, newPresences);
    setOnlineUsers(prev => {
      const next = new Set(prev);
      newPresences.forEach(presence => {
        if (presence.user_id) {
          next.add(presence.user_id);
        }
      });
      return next;
    });
  }, []);

  const handlePresenceLeave = useCallback(({ key, leftPresences }: { key: string, leftPresences: PresencePayload[] }) => {
    console.log('👋 User left:', key, leftPresences);
    setOnlineUsers(prev => {
      const next = new Set(prev);
      leftPresences.forEach(presence => {
        if (presence.user_id) {
          next.delete(presence.user_id);
        }
      });
      return next;
    });
    
    setTypingUsers(prev => {
      const next = new Map(prev);
      leftPresences.forEach(presence => {
        if (presence.user_id) {
          next.delete(presence.user_id);
        }
      });
      return next;
    });
  }, []);

  const handleNewMessage = useCallback((payload: { new: RealtimeMessage }) => {
    if (!user || payload.new.sender_id === user.id) return;
    
    console.log('📨 New message received:', payload.new);
    callbacksRef.current.onMessage?.(payload.new);
  }, [user]);

  const handleMessageUpdate = useCallback((payload: { new: RealtimeMessage; old?: RealtimeMessage }) => {
    console.log('📝 Message updated:', payload.new);
    
    // Handle read receipts
    if (payload.old && (
      payload.new.read_by_landlord !== payload.old.read_by_landlord ||
      payload.new.read_by_tenant !== payload.old.read_by_tenant
    )) {
      const ack: MessageAck = {
        messageId: payload.new.id,
        status: 'read',
        timestamp: new Date().toISOString(),
        conversationId: payload.new.conversation_id,
        recipientId: user?.id === payload.new.sender_id ? undefined : user?.id
      };
      callbacksRef.current.onMessageAck?.(ack);
    }
  }, [user]);

  const handleConversationUpdate = useCallback((payload: { new: ConversationUpdatePayload }) => {
    console.log('💬 Conversation updated:', payload.new);
    callbacksRef.current.onConversationUpdate?.(payload.new.id, payload.new);
  }, []);

  const handleTypingEvent = useCallback((payload: { payload: TypingIndicatorPayload }) => {
    const { user_id, conversation_id, typing } = payload.payload;
    
    if (!user_id || user_id === user?.id) return;
    
    console.log('⌨️ User typing:', { user_id, conversation_id, typing });
    
    if (typing) {
      const typingUser: TypingUser = {
        userId: user_id,
        conversationId: conversation_id,
        lastTypingEvent: new Date()
      };
      
      setTypingUsers(prev => new Map(prev).set(user_id, typingUser));
      callbacksRef.current.onUserTyping?.(user_id, conversation_id);
      
      // Set a timeout to automatically stop the typing indicator after 5 seconds
      const timer = setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          const userState = next.get(user_id);
          
          // Only remove if the typing event is older than 5 seconds
          if (userState && (Date.now() - userState.lastTypingEvent.getTime() > 5000)) {
            next.delete(user_id);
            callbacksRef.current.onUserStoppedTyping?.(user_id);
          }
          
          return next;
        });
      }, 5000);
      
      return () => clearTimeout(timer);
    } else {
      setTypingUsers(prev => {
        const next = new Map(prev);
        if (next.has(user_id)) {
          next.delete(user_id);
          return next;
        }
        return prev;
      });
      callbacksRef.current.onUserStoppedTyping?.(user_id);
    }
  }, [user]);

  const connect = useCallback(async () => {
    if (!user || channelRef.current || isConnectingRef.current) {
      console.log('Skipping connection - already connected or no user');
      return;
    }

    isConnectingRef.current = true;
    console.log('🔌 Connecting to WebSocket...');
    updateConnectionStatus('connecting');

    try {
      // Create a unique channel name for this connection
      const channelName = `user-${user.id}-${Date.now()}`;
      
      // Initialize the Supabase channel
      channelRef.current = supabase.channel(channelName, {
        config: {
          presence: {
            key: user.id,
          },
          broadcast: { self: true },
        },
      });
      
      if (!channelRef.current) {
        throw new Error('Failed to create WebSocket channel');
      }
      
      // Set up presence tracking
      channelRef.current
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState<PresencePayload>();
          if (state) {
            handlePresenceSync(state);
          }
        })
        .on('presence', { event: 'join' }, (payload: { key: string; newPresences: PresencePayload[] }) => {
          handlePresenceJoin({
            key: payload.key,
            newPresences: payload.newPresences
          });
        })
        .on('presence', { event: 'leave' }, (payload: { key: string; leftPresences: PresencePayload[] }) => {
          handlePresenceLeave({
            key: payload.key,
            leftPresences: payload.leftPresences
          });
        });
      
      // Set up message subscriptions
      channelRef.current
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        }, handleNewMessage)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        }, handleMessageUpdate)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        }, handleConversationUpdate)
        .on('broadcast', 
          { event: 'typing' }, 
          (payload: { payload: TypingIndicatorPayload }) => handleTypingEvent({ payload })
        );
      
      // Subscribe to the channel
      const subscription = channelRef.current.subscribe(async (status: SubscriptionStatus) => {
        console.log('📡 Subscription status:', status);
        isConnectingRef.current = false;
        
        switch (status) {
          case 'SUBSCRIBED':
            try {
              // Track user presence
              const presenceTrackStatus = await channelRef.current?.track({
                user_id: user.id,
                online_at: new Date().toISOString(),
                user_agent: navigator.userAgent,
                last_active: new Date().toISOString(),
              });
              
              console.log('👤 Presence tracking status:', presenceTrackStatus);
              
              // Reset reconnect attempts on successful connection
              reconnectAttemptsRef.current = 0;
              updateConnectionStatus('connected');
              
              // Start heartbeat
              startHeartbeat();
              
              console.log('✅ Successfully connected to WebSocket channel');
            } catch (error) {
              console.error('❌ Error during presence tracking:', error);
              updateConnectionStatus('disconnected', 'Failed to establish presence');
              scheduleReconnect();
            }
            break;
            
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            console.error(`❌ Connection ${status.toLowerCase()}, will retry...`);
            updateConnectionStatus('reconnecting', `Connection ${status.toLowerCase()}`);
            handleConnectionError();
            break;
            
          case 'CLOSED':
            console.log('🔌 Connection closed by server');
            updateConnectionStatus('disconnected', 'Connection closed by server');
            scheduleReconnect();
            break;
        }
      });
      
      // Handle any subscription errors
      subscription.on('error', (error: Error) => {
        console.error('❌ Subscription error:', error);
        updateConnectionStatus('reconnecting', error.message);
        handleConnectionError();
      });
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      handleConnectionError();
    }
  }, [user]);

  const cleanupConnection = useCallback(() => {
    // Clear any pending timeouts/intervals
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    // Clear typing indicators
    setTypingUsers(new Map());
    lastTypingEventRef.current.clear();
  }, []);

  const disconnect = useCallback(async () => {
    if (!channelRef.current) return;
    
    console.log('🔌 Disconnecting from WebSocket...');
    
    isConnectingRef.current = false;
    updateConnectionStatus('disconnected', 'User initiated disconnect');
    
    try {
      // Untrack presence before leaving
      await channelRef.current.untrack();
      
      // Unsubscribe from the channel
      const { error } = await supabase.removeChannel(channelRef.current);
      
      if (error) {
        console.error('Error while disconnecting:', error);
      } else {
        console.log('Successfully disconnected from WebSocket');
      }
    } catch (error) {
      console.error('Error during WebSocket disconnection:', error);
    } finally {
      channelRef.current = null;
      cleanupConnection();
    }
    reconnectAttemptsRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    // Cap at 5 attempts, then stop trying for a while
    if (reconnectAttemptsRef.current >= 5) {
      console.log('🔄 Max reconnection attempts reached, pausing...');
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})...`);
    
    setConnectionStatus(prev => ({ 
      ...prev, 
      status: 'reconnecting',
      reconnectAttempts: reconnectAttemptsRef.current 
    }));
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  };

  const startHeartbeat = () => {
    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // Send initial heartbeat
    const sendHeartbeat = async () => {
      if (!channelRef.current) return;
      
      try {
        const presenceTrackStatus = await channelRef.current.track({
          user_id: user?.id || 'unknown',
          last_active: new Date().toISOString(),
          status: 'online',
          device_info: {
            user_agent: navigator.userAgent,
            online: navigator.onLine,
          },
        });
        
        if (presenceTrackStatus !== 'ok') {
          console.warn('Heartbeat failed to update presence:', presenceTrackStatus);
          // Try to reconnect if presence update fails
          if (presenceTrackStatus === 'timed out' || presenceTrackStatus === 'error') {
            handleConnectionError();
          }
        }
      } catch (error) {
        console.error('Error sending heartbeat:', error);
        handleConnectionError();
      }
    };

    // Send immediately
    sendHeartbeat();
    
    // Then set up the interval (every 25 seconds to be safe)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 25000);
  };

  const handleConnectionError = useCallback(() => {
    // Don't try to reconnect if we're already in the process of connecting
    if (isConnectingRef.current) return;
    
    // If we've reached max attempts, give up
    if (reconnectAttemptsRef.current >= 5) {
      console.error('Max reconnection attempts reached. Please refresh the page.');
      updateConnectionStatus(
        'disconnected', 
        'Connection lost. Please refresh the page.'
      );
      return;
    }

    // Exponential backoff with jitter
    const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    const delay = Math.floor(baseDelay + jitter);
    
    reconnectAttemptsRef.current++;

    console.log(`⏳ Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/5)...`);
    
    updateConnectionStatus('reconnecting', `Reconnecting (${reconnectAttemptsRef.current}/5)...`);

    // Clear any existing timeout to avoid multiple reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isConnectingRef.current) {
        console.log('🔄 Attempting to reconnect...');
        connect().catch(error => {
          console.error('Reconnection attempt failed:', error);
          handleConnectionError(); // Retry on error
        });
      }
    }, delay);
  }, [connect, updateConnectionStatus]);

  const sendMessage = useCallback(async (message: Omit<RealtimeMessage, 'id' | 'created_at' | 'optimistic'>) => {
    if (!channelRef.current || !user) {
      console.error('Cannot send message: No active connection or user');
      return null;
    }
    
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    
    // Create optimistic message
    const optimisticMessage: RealtimeMessage = {
      ...message,
      id: tempId,
      created_at: now,
      updated_at: now,
      optimistic: true,
      read_by_landlord: message.sender_id === user.id ? false : undefined,
      read_by_tenant: message.sender_id === user.id ? false : undefined,
    };
    
    try {
      // Immediately add to local state
      callbacksRef.current.onMessage?.(optimisticMessage);
      
      // Send message via WebSocket
      const messagePayload: WebSocketMessage<RealtimeMessage> = {
        type: 'message_sent',
        payload: {
          ...optimisticMessage,
          // Clear temporary fields
          optimistic: undefined,
          tempId: undefined,
        },
        timestamp: now,
        messageId: tempId,
        conversationId: message.conversation_id,
        senderId: user.id,
      };
      
      const { error } = await channelRef.current.send(messagePayload);
      
      if (error) {
        console.error('Failed to send message:', error);
        // Update message with error state
        callbacksRef.current.onMessage?.({
          ...optimisticMessage,
          error: 'Failed to send message',
        });
        return null;
      }
      
      // Return the temp ID for potential updates
      return tempId;
    } catch (error) {
      console.error('Error sending message:', error);
      // Update message with error state
      callbacksRef.current.onMessage?.({
        ...optimisticMessage,
        error: error instanceof Error ? error.message : 'Failed to send message',
      });
      return null;
    }
  }, [user]);

  const registerCallbacks = useCallback((callbacks: {
    onMessageAck?: (ack: MessageAck) => void;
    onUserTyping?: (userId: string, conversationId: string) => void;
    onUserStoppedTyping?: (userId: string) => void;
    onConversationUpdate?: (conversationId: string, data: any) => void;
  }) => {
    callbacksRef.current = callbacks;
  }, []);

  // Auto-connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, connect, disconnect]);

  // Handle visibility change for connection management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - maintain connection but reduce heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      } else {
        // Page visible - restore full functionality
        if (connectionStatus.status === 'connected') {
          startHeartbeat();
        } else if (connectionStatus.status === 'disconnected') {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectionStatus.status, connect]);

  return {
    connectionStatus,
    onlineUsers,
    typingUsers,
    connect,
    disconnect,
    sendTypingIndicator,
    sendMessageAck,
    registerCallbacks
  };
}
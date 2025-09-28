import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  lastConnected?: Date;
  reconnectAttempts: number;
}

export interface MessageAck {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
}

export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachment_url?: string | null;
  created_at: string;
  optimistic?: boolean;
  tempId?: string;
  read_by_landlord?: boolean;
  read_by_tenant?: boolean;
  viewing_proposal_id?: string | null;
}

interface WebSocketMessage {
  type: 'message_sent' | 'message_delivered' | 'message_read' | 'user_typing' | 'user_online' | 'user_offline' | 'conversation_update';
  payload: any;
}

export function useWebSocketConnection() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  });
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0); // Fix stale closure issue
  const isConnectingRef = useRef(false); // Prevent duplicate connections
  const callbacksRef = useRef<{
    onMessage?: (message: RealtimeMessage) => void;
    onMessageAck?: (ack: MessageAck) => void;
    onUserTyping?: (userId: string, conversationId: string) => void;
    onUserStoppedTyping?: (userId: string) => void;
    onConversationUpdate?: (conversationId: string, data: any) => void;
  }>({});

  const connect = useCallback(() => {
    if (!user || channelRef.current || isConnectingRef.current) return;

    isConnectingRef.current = true;
    console.log('🔌 Connecting to WebSocket...');
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

    try {
      // Create single channel for all real-time updates
      channelRef.current = supabase
        .channel('unified-messaging')
        .on('presence', { event: 'sync' }, () => {
          const state = channelRef.current?.presenceState();
          const online = new Set<string>();
          
          Object.values(state || {}).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              online.add(presence.user_id);
            });
          });
          
          setOnlineUsers(online);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
          console.log('👋 User joined:', key, newPresences);
          newPresences.forEach((presence: any) => {
            setOnlineUsers(prev => new Set(prev).add(presence.user_id));
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
          console.log('👋 User left:', key, leftPresences);
          leftPresences.forEach((presence: any) => {
            setOnlineUsers(prev => {
              const next = new Set(prev);
              next.delete(presence.user_id);
              return next;
            });
            setTypingUsers(prev => {
              const next = new Map(prev);
              next.delete(presence.user_id);
              return next;
            });
          });
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('📨 New message:', payload.new);
          const message = payload.new as RealtimeMessage;
          if (message.sender_id !== user.id) {
            callbacksRef.current.onMessage?.(message);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('📝 Message updated:', payload.new);
          const message = payload.new as any;
          
          // Handle message read acknowledgments
          if (message.read_by_landlord !== payload.old?.read_by_landlord || 
              message.read_by_tenant !== payload.old?.read_by_tenant) {
            const ack: MessageAck = {
              messageId: message.id,
              status: 'read',
              timestamp: new Date().toISOString()
            };
            callbacksRef.current.onMessageAck?.(ack);
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations'
        }, (payload) => {
          console.log('💬 Conversation updated:', payload.new);
          callbacksRef.current.onConversationUpdate?.(payload.new.id, payload.new);
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          console.log('⌨️ User typing:', payload);
          const { user_id, conversation_id, typing } = payload.payload;
          
          if (user_id !== user.id) {
            if (typing) {
              setTypingUsers(prev => new Map(prev).set(user_id, conversation_id));
              callbacksRef.current.onUserTyping?.(user_id, conversation_id);
            } else {
              setTypingUsers(prev => {
                const next = new Map(prev);
                next.delete(user_id);
                return next;
              });
              callbacksRef.current.onUserStoppedTyping?.(user_id);
            }
          }
        })
        .subscribe(async (status) => {
          console.log('📡 Subscription status:', status);
          isConnectingRef.current = false;
          
          if (status === 'SUBSCRIBED') {
            // Track user presence
            await channelRef.current?.track({
              user_id: user.id,
              online_at: new Date().toISOString()
            });
            
            // Reset reconnect attempts on successful connection
            reconnectAttemptsRef.current = 0;
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0
            });

            // Start heartbeat
            startHeartbeat();
            
            console.log('✅ Connected to unified messaging channel');
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('❌ Connection failed, will retry...');
            handleConnectionError();
          } else if (status === 'CLOSED') {
            console.log('🔌 Connection closed');
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
            scheduleReconnect();
          }
        });
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      handleConnectionError();
    }
  }, [user]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from WebSocket...');
    
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setConnectionStatus({ status: 'disconnected', reconnectAttempts: 0 });
    setOnlineUsers(new Set());
    setTypingUsers(new Map());
  }, []);

  const handleConnectionError = () => {
    isConnectingRef.current = false;
    reconnectAttemptsRef.current += 1;
    
    setConnectionStatus(prev => ({
      ...prev,
      status: 'disconnected',
      reconnectAttempts: reconnectAttemptsRef.current
    }));
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    scheduleReconnect();
  };

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
    // Remove heartbeat to prevent unnecessary connection issues
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId: string, typing: boolean) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: user.id,
          conversation_id: conversationId,
          typing
        }
      });
    }
  }, [user]);

  // Send message acknowledgment
  const sendMessageAck = useCallback(async (messageId: string, status: 'delivered' | 'read') => {
    if (!user) return;

    try {
      // Get user role to determine which field to update
      const { data: userRoleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      const isLandlordUser = userRoleData?.role === 'landlord';
      const updateField = isLandlordUser ? 'read_by_landlord' : 'read_by_tenant';
      
      await supabase
        .from('messages')
        .update({ [updateField]: status === 'read' })
        .eq('id', messageId);
        
      const ack: MessageAck = {
        messageId,
        status,
        timestamp: new Date().toISOString()
      };
      
      callbacksRef.current.onMessageAck?.(ack);
    } catch (error) {
      console.error('❌ Failed to send message ack:', error);
    }
  }, [user]);

  // Register callbacks
  const registerCallbacks = useCallback((callbacks: {
    onMessage?: (message: RealtimeMessage) => void;
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
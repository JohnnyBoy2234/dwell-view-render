// @ts-nocheck
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CachedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_by_landlord: boolean;
  read_by_tenant: boolean;
  profiles?: { display_name: string } | null;
  optimistic?: boolean; // For instant UI updates
  attachment_url?: string | null;
  message_type?: string;
  updated_at?: string;
  edited_at?: string | null;
  viewing_proposal_id?: string | null;
}

interface MessageCache {
  [conversationId: string]: CachedMessage[];
}

export function useMessageCache() {
  const [cache, setCache] = useState<MessageCache>({});
  const [loadingConversations, setLoadingConversations] = useState<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get messages from cache instantly, load from server if not cached
  const getMessages = useCallback(async (conversationId: string): Promise<CachedMessage[]> => {
    // Return cached messages immediately if available
    if (cache[conversationId]) {
      return cache[conversationId];
    }

    // Try hydrate from localStorage for instant warm load
    let cachedMessages: CachedMessage[] = [];
    try {
      const localKey = `sr_msgs_${conversationId}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedMessage[];
        if (Array.isArray(parsed)) {
          cachedMessages = parsed;
          setCache(prev => ({ ...prev, [conversationId]: parsed }));
        }
      }
    } catch {}

    // If already loading, return cached messages (don't block with empty array)
    if (loadingConversations.has(conversationId)) {
      return cachedMessages;
    }

    // Start loading from server
    setLoadingConversations(prev => new Set(prev).add(conversationId));

    // Add timeout to prevent stuck loading states
    const timeoutId = setTimeout(() => {
      setLoadingConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
      console.warn('Message loading timeout for conversation:', conversationId);
    }, 10000); // 10 second timeout

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get unique sender IDs for profile fetching
      const senderIds = [...new Set((messagesData || []).map(msg => msg.sender_id))];
      
      // Fetch profiles separately to avoid join issues
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      // Create profile map for quick lookup
      const profileMap = new Map();
      (profilesData || []).forEach(profile => {
        profileMap.set(profile.user_id, { display_name: profile.display_name });
      });

      const messages: CachedMessage[] = (messagesData || []).map(msg => ({
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        read_by_landlord: msg.read_by_landlord,
        read_by_tenant: msg.read_by_tenant,
        profiles: profileMap.get(msg.sender_id) || null,
        attachment_url: msg.attachment_url,
        message_type: msg.message_type,
        updated_at: msg.updated_at,
        edited_at: msg.edited_at,
        viewing_proposal_id: msg.viewing_proposal_id,
        optimistic: false
      }));

      if (isMountedRef.current) {
        const trimmed = messages.slice(-50);
        setCache(prev => ({
          ...prev,
          [conversationId]: trimmed
        }));
        // Persist to localStorage for warm loads
        try {
          const localKey = `sr_msgs_${conversationId}`;
          localStorage.setItem(localKey, JSON.stringify(trimmed));
        } catch {}
      }

      // Always clear loading state and return messages
      clearTimeout(timeoutId);
      setLoadingConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });

      return messages;
    } catch (error) {
      console.error('Error loading messages:', error);
      clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setLoadingConversations(prev => {
          const newSet = new Set(prev);
          newSet.delete(conversationId);
          return newSet;
        });
      }
      return cachedMessages; // Return cached messages instead of empty array on error
    }
  }, [cache, loadingConversations]);

  // Add optimistic message (shows instantly before server confirmation)
  const addOptimisticMessage = useCallback((conversationId: string, message: Partial<CachedMessage>) => {
    const optimisticMessage: CachedMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: message.sender_id!,
      content: message.content!,
      created_at: new Date().toISOString(),
      read_by_landlord: false,
      read_by_tenant: false,
      optimistic: true,
      ...message
    };

    setCache(prev => {
      const next = {
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), optimisticMessage].slice(-50)
      };
      try {
        localStorage.setItem(`sr_msgs_${conversationId}`, JSON.stringify(next[conversationId]));
      } catch {}
      return next;
    });

    return optimisticMessage.id;
  }, []);

  // Update message when server confirms it
  const confirmMessage = useCallback((conversationId: string, tempId: string, realMessage: CachedMessage) => {
    setCache(prev => {
      const updated = (prev[conversationId] || []).map(msg =>
        msg.id === tempId ? { ...realMessage, optimistic: false } : msg
      ).slice(-50);
      const next = { ...prev, [conversationId]: updated };
      try {
        localStorage.setItem(`sr_msgs_${conversationId}`, JSON.stringify(updated));
      } catch {}
      return next;
    });
  }, []);

  // Add real-time message
  const addRealtimeMessage = useCallback((message: CachedMessage) => {
    setCache(prev => {
      const sorted = [
        ...(prev[message.conversation_id] || []).filter(m => m.id !== message.id),
        message
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).slice(-50);
      const next = { ...prev, [message.conversation_id]: sorted };
      try {
        localStorage.setItem(`sr_msgs_${message.conversation_id}`, JSON.stringify(sorted));
      } catch {}
      return next;
    });
  }, []);

  // Update message read status
  const updateMessageReadStatus = useCallback((conversationId: string, messageId: string, updates: Partial<CachedMessage>) => {
    setCache(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    }));
  }, []);

  // Clear cache for conversation (useful for refreshing)
  const clearConversationCache = useCallback((conversationId: string) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[conversationId];
      return newCache;
    });
  }, []);

  return {
    getMessages,
    addOptimisticMessage,
    confirmMessage,
    addRealtimeMessage,
    updateMessageReadStatus,
    clearConversationCache,
    isLoading: (conversationId: string) => loadingConversations.has(conversationId),
    getCachedMessages: (conversationId: string) => cache[conversationId] || []
  };
}
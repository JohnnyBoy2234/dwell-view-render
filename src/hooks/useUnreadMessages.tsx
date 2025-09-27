import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from './useRealtime';

export function useUnreadMessages() {
  const { user, isLandlord } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  const fetchUnreadCount = useCallback(async (showLoading = false) => {
    if (!user) {
      if (isMountedRef.current) {
        setUnreadCount(0);
      }
      return;
    }

    if (!isMountedRef.current) return;
    if (showLoading) {
      setLoading(true);
    }
    try {
      // Get conversations where the user is either landlord or tenant
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);

      if (conversationError) throw conversationError;

      if (!conversations || conversations.length === 0) {
        if (isMountedRef.current) {
          setUnreadCount(0);
        }
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Count unread messages based on user role, excluding messages sent by current user
      let query = supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id); // Don't count messages sent by current user

      if (isLandlord) {
        // For landlords, count messages not read by landlord
        query = query.eq('read_by_landlord', false);
      } else {
        // For tenants, count messages not read by tenant
        query = query.eq('read_by_tenant', false);
      }

      const { count, error: messageError } = await query;

      if (messageError) throw messageError;

      if (isMountedRef.current) {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
      if (isMountedRef.current) {
        setUnreadCount(0);
      }
    } finally {
      if (isMountedRef.current && showLoading) {
        setLoading(false);
      }
    }
  }, [user, isLandlord]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchUnreadCount(true);
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchUnreadCount();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  // Re-enable real-time subscription for unread messages
  useRealtime({
    onMessageChange: () => {
      console.log('🔄 Refreshing unread messages due to real-time update');
      if (isMountedRef.current) {
        fetchUnreadCount();
      }
    }
  });

  return { unreadCount, loading, refetch: () => fetchUnreadCount(true) };
}
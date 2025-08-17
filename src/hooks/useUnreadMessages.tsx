import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useUnreadMessages() {
  const { user, isLandlord } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      // Get conversations where the user is either landlord or tenant
      const { data: conversations, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`);

      if (conversationError) throw conversationError;

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
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

      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [user, isLandlord]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refetch unread count when new messages arrive
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        () => {
          // Refetch unread count when messages are marked as read
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
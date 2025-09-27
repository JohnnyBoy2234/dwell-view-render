import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useRealtime } from './useRealtime';
import { Notification, CreateNotificationData, NotificationFilters } from '@/types/notification';

export const useNotifications = (filters?: NotificationFilters) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const isMountedRef = useRef(true);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🔔 Fetching notifications for user:', user.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      console.log('🔔 Raw notification data:', { data, error });

      if (error) {
        // If table doesn't exist, just return empty data instead of crashing
        if (error.code === '42P01' || error.message.includes('relation "notifications" does not exist')) {
          console.log('Notifications table does not exist, returning empty data');
          setNotifications([]);
          setUnreadCount(0);
          setError(null);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Ensure data is an array and has the expected structure
      const validNotifications = (data || []).filter(notification => 
        notification && 
        typeof notification === 'object' && 
        notification.id
      );
      
      const unreadCount = validNotifications.filter(n => !n.is_read).length;
      console.log('🔔 Notifications fetched:', {
        total: validNotifications.length,
        unread: unreadCount,
        notifications: validNotifications.map(n => ({ id: n.id, is_read: n.is_read, message: n.message }))
      });
      
      if (isMountedRef.current) {
        setNotifications(validNotifications as Notification[]);
        setUnreadCount(unreadCount);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      if (isMountedRef.current) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      }
    }
  }, [user]);

  // Mark notification as unread
  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: false
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      if (isMountedRef.current) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: false }
              : n
          )
        );
        setUnreadCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error marking notification as unread:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to mark notification as unread');
      }
    }
  }, [user]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) {
      console.log('No user, cannot mark all as read');
      return;
    }

    console.log('🔔 Marking all notifications as read for user:', user.id);
    
    // Just update local state immediately - like the chat does
    if (isMountedRef.current) {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, is_read: true }));
        console.log('🔔 Local state updated:', updated.length, 'notifications marked as read');
        return updated;
      });
      setUnreadCount(0);
      console.log('🔔 Unread count set to 0 - badge should disappear');
    }
    
    // Try to update database in the background (non-blocking)
    try {
      // Simple update approach - mark all unread notifications as read for this user
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (updateError) {
        console.log('🔔 Database update failed (non-blocking):', updateError);
      } else {
        console.log('🔔 Database updated successfully - all unread notifications marked as read');
      }
    } catch (error) {
      console.log('🔔 Database update failed (non-blocking):', error);
      // Don't worry about database errors - local state is already updated
    }
  }, [user]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      const notification = notifications.find(n => n.id === notificationId);
      if (isMountedRef.current) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete notification');
      }
    }
  }, [user, notifications]);

  // Create notification (for testing or admin use)
  const createNotification = useCallback(async (data: CreateNotificationData) => {
    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      // Update local state if it's for the current user
      if (notification.user_id === user?.id && isMountedRef.current) {
        setNotifications(prev => [notification as Notification, ...prev]);
        if (!notification.is_read) {
          setUnreadCount(prev => prev + 1);
        }
      }

      return notification;
    } catch (err) {
      console.error('Error creating notification:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to create notification');
      }
      throw err;
    }
  }, [user]);

  // Set up real-time subscription with error handling
  useRealtime({
    onNotificationChange: () => {
      console.log('🔄 Refreshing notifications due to real-time update');
      if (isMountedRef.current) {
        fetchNotifications();
      }
    }
  });

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchNotifications();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Initial fetch with mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    fetchNotifications();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    isConnected,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refetch: fetchNotifications
  };
};
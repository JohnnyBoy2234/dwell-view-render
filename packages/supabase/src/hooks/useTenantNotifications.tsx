// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@mzanzihomes/supabase/client';
import { useAuth } from './useAuth';
import { useRealtime } from './useRealtime';

export interface TenantNotification {
  id: string;
  type: 'lease_ready' | 'lease_update' | 'payment_due';
  title: string;
  message: string;
  propertyAddress: string;
  landlordName: string;
  tenancyId: string;
  createdAt: string;
  isRead: boolean;
}

export interface PendingLease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  monthly_rent: number;
  security_deposit: number;
  start_date: string;
  end_date: string | null;
  lease_status: string;
  lease_document_url: string | null;
  lease_document_path?: string | null;
  created_at: string;
  property_title: string;
  property_location: string;
  landlord_name: string;
}

export const useTenantNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [pendingLeases, setPendingLeases] = useState<PendingLease[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingLeases();
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [user]);

  // Add real-time subscriptions
  useRealtime({
    onTenancyChange: () => {
      if (isMountedRef.current && user) {
        fetchNotifications();
        fetchPendingLeases();
      }
    }
  });

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // For now, create notifications based on pending leases
      // In a real app, you'd have a dedicated notifications table
      const { data: tenancies, error } = await supabase
        .from('tenancies')
        .select(`
          *,
          properties!inner (
            title,
            location
          ),
          landlord_profile:profiles!fk_tenancies_landlord (
            display_name
          )
        `)
        .eq('tenant_id', user.id)
.in('lease_status', ['awaiting_tenant_signature'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check read status for each notification
      const { data: readStatuses } = await supabase
        .from('notification_read_status')
        .select('notification_key, is_read')
        .eq('user_id', user.id)
        .in('notification_key', (tenancies || []).map((t: any) => `tenant_lease_${t.id}`));

      const readStatusMap = new Map(
        (readStatuses || []).map(status => [status.notification_key, status.is_read])
      );

      const notificationsData: TenantNotification[] = (tenancies || []).map((tenancy: any) => ({
        id: tenancy.id,
        type: 'lease_ready' as const,
        title: 'Lease Ready for Signature',
        message: `Your lease agreement for ${tenancy.properties?.title} is ready for your signature.`,
        propertyAddress: tenancy.properties?.location || 'Address not available',
        landlordName: tenancy.landlord_profile?.display_name || 'Landlord',
        tenancyId: tenancy.id,
        createdAt: tenancy.created_at,
        isRead: readStatusMap.get(`tenant_lease_${tenancy.id}`) || false
      }));

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingLeases = async () => {
    if (!user) return;

    try {
      const { data: tenancies, error } = await supabase
        .from('tenancies')
        .select(`
          *,
          properties!inner (
            title,
            location
          ),
          landlord_profile:profiles!fk_tenancies_landlord (
            display_name
          )
        `)
        .eq('tenant_id', user.id)
.in('lease_status', ['awaiting_tenant_signature'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leasesData: PendingLease[] = (tenancies || []).map((tenancy: any) => ({
        id: tenancy.id,
        property_id: tenancy.property_id,
        landlord_id: tenancy.landlord_id,
        tenant_id: tenancy.tenant_id,
        monthly_rent: tenancy.monthly_rent,
        security_deposit: tenancy.security_deposit,
        start_date: tenancy.start_date,
        end_date: tenancy.end_date,
        lease_status: tenancy.lease_status,
        lease_document_url: tenancy.lease_document_url || null,
        created_at: tenancy.created_at,
        property_title: tenancy.properties?.title || 'Unknown Property',
        property_location: tenancy.properties?.location || 'Address not available',
        landlord_name: tenancy.landlord_profile?.display_name || 'Landlord'
      }));

      setPendingLeases(leasesData);
    } catch (error) {
      console.error('Error fetching pending leases:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update in database
      const notificationKey = `tenant_lease_${notificationId}`;
      await supabase
        .from('notification_read_status')
        .upsert({
          user_id: user?.id,
          notification_key: notificationKey,
          is_read: true,
          read_at: new Date().toISOString()
        });

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking tenant notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Marking all tenant notifications as read:', notifications.length);
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
      
      console.log('🔔 All tenant notifications marked as read');
    } catch (error) {
      console.error('Error marking all tenant notifications as read:', error);
    }
  };

  return {
    notifications,
    pendingLeases,
    loading,
    fetchNotifications,
    fetchPendingLeases,
    markAsRead,
    markAllAsRead,
    unreadCount: notifications.filter(n => !n.isRead).length
  };
};
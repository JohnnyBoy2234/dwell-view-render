import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';

export interface LandlordNotification {
  id: string;
  type: 'lease_signed_by_tenant' | 'application_received' | 'payment_received';
  title: string;
  message: string;
  propertyAddress: string;
  tenantName: string;
  tenancyId: string;
  createdAt: string;
  isRead: boolean;
}

export interface PendingSignature {
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
  tenant_signed_at: string | null;
  created_at: string;
  property_title: string;
  property_location: string;
  tenant_name: string;
}

export const useLandlordNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<LandlordNotification[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingSignatures();
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
        fetchPendingSignatures();
      }
    }
  });

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create notifications based on leases that need landlord signature
      const { data: tenancies, error } = await supabase
        .from('tenancies')
        .select(`
          *,
          properties!inner (
            title,
            location
          ),
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name
          )
        `)
        .eq('landlord_id', user.id)
.eq('lease_status', 'awaiting_landlord_signature')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check read status for each notification
      const { data: readStatuses } = await supabase
        .from('notification_read_status')
        .select('notification_key, is_read')
        .eq('user_id', user.id)
        .in('notification_key', (tenancies || []).map((t: any) => `landlord_lease_${t.id}`));

      const readStatusMap = new Map(
        (readStatuses || []).map(status => [status.notification_key, status.is_read])
      );

      const notificationsData: LandlordNotification[] = (tenancies || []).map((tenancy: any) => ({
        id: tenancy.id,
        type: 'lease_signed_by_tenant' as const,
        title: 'Lease Ready for Your Signature',
        message: `${tenancy.tenant_profile?.display_name || 'A tenant'} has signed the lease for ${tenancy.properties?.title}. Add your signature to finalize the agreement.`,
        propertyAddress: tenancy.properties?.location || 'Address not available',
        tenantName: tenancy.tenant_profile?.display_name || 'Tenant',
        tenancyId: tenancy.id,
        createdAt: tenancy.tenant_signed_at || tenancy.created_at,
        isRead: readStatusMap.get(`landlord_lease_${tenancy.id}`) || false
      }));

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching landlord notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSignatures = async () => {
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
          tenant_profile:profiles!fk_tenancies_tenant (
            display_name
          )
        `)
        .eq('landlord_id', user.id)
.eq('lease_status', 'awaiting_landlord_signature')
        .order('tenant_signed_at', { ascending: false });

      if (error) throw error;

      const signaturesData: PendingSignature[] = (tenancies || []).map((tenancy: any) => ({
        id: tenancy.id,
        property_id: tenancy.property_id,
        landlord_id: tenancy.landlord_id,
        tenant_id: tenancy.tenant_id,
        monthly_rent: tenancy.monthly_rent,
        security_deposit: tenancy.security_deposit,
        start_date: tenancy.start_date,
        end_date: tenancy.end_date,
        lease_status: tenancy.lease_status,
        lease_document_url: tenancy.lease_document_url,
        tenant_signed_at: tenancy.tenant_signed_at,
        created_at: tenancy.created_at,
        property_title: tenancy.properties?.title || 'Unknown Property',
        property_location: tenancy.properties?.location || 'Address not available',
        tenant_name: tenancy.tenant_profile?.display_name || 'Tenant'
      }));

      setPendingSignatures(signaturesData);
    } catch (error) {
      console.error('Error fetching pending signatures:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update in database
      const notificationKey = `landlord_lease_${notificationId}`;
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
      console.error('Error marking landlord notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('🔔 Marking all landlord notifications as read:', notifications.length);
      // Mark all unread notifications as read
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await markAsRead(notification.id);
      }
      
      console.log('🔔 All landlord notifications marked as read');
    } catch (error) {
      console.error('Error marking all landlord notifications as read:', error);
    }
  };

  return {
    notifications,
    pendingSignatures,
    loading,
    fetchNotifications,
    fetchPendingSignatures,
    markAsRead,
    markAllAsRead,
    unreadCount: notifications.filter(n => !n.isRead).length
  };
};
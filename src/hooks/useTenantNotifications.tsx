import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingLeases();
    }
  }, [user]);

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

      const notificationsData: TenantNotification[] = (tenancies || []).map((tenancy: any) => ({
        id: tenancy.id,
        type: 'lease_ready' as const,
        title: 'Lease Ready for Signature',
        message: `Your lease agreement for ${tenancy.properties?.title} is ready for your signature.`,
        propertyAddress: tenancy.properties?.location || 'Address not available',
        landlordName: tenancy.landlord_profile?.display_name || 'Landlord',
        tenancyId: tenancy.id,
        createdAt: tenancy.created_at,
        isRead: false
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

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  return {
    notifications,
    pendingLeases,
    loading,
    fetchNotifications,
    fetchPendingLeases,
    markAsRead,
    unreadCount: notifications.filter(n => !n.isRead).length
  };
};
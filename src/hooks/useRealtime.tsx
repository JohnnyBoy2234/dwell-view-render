import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RealtimeCallbacks {
  onNotificationChange?: () => void;
  onMessageChange?: () => void;
  onViewingProposalChange?: () => void;
  onApplicationChange?: () => void;
  onMaintenanceChange?: () => void;
  onLeaseChange?: () => void;
  onPropertyChange?: () => void;
  onTenancyChange?: () => void;
}

export function useRealtime(callbacks: RealtimeCallbacks = {}) {
  const { user, isLandlord } = useAuth();
  const isMountedRef = useRef(true);

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) return () => {};

    const channels: any[] = [];

    // Notifications real-time subscription
    if (callbacks.onNotificationChange) {
      const notificationChannel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('🔔 Notification change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onNotificationChange?.();
            } catch (error) {
              console.error('Error in notification callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(notificationChannel);
    }

    // Messages real-time subscription
    if (callbacks.onMessageChange) {
      const messageChannel = supabase
        .channel('messages-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            console.log('💬 Message change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onMessageChange?.();
            } catch (error) {
              console.error('Error in message callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(messageChannel);
    }

    // Viewing proposals real-time subscription
    if (callbacks.onViewingProposalChange) {
      const viewingChannel = supabase
        .channel('viewing-proposals-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'viewing_proposals'
          },
          (payload) => {
            console.log('📅 Viewing proposal change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onViewingProposalChange?.();
            } catch (error) {
              console.error('Error in viewing proposal callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(viewingChannel);
    }

    // Applications real-time subscription
    if (callbacks.onApplicationChange) {
      const applicationChannel = supabase
        .channel('applications-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'applications'
          },
          (payload) => {
            console.log('📋 Application change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onApplicationChange?.();
            } catch (error) {
              console.error('Error in application callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(applicationChannel);
    }

    // Maintenance requests real-time subscription
    if (callbacks.onMaintenanceChange) {
      const maintenanceChannel = supabase
        .channel('maintenance-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'maintenance_requests'
          },
          (payload) => {
            console.log('🔧 Maintenance change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onMaintenanceChange?.();
            } catch (error) {
              console.error('Error in maintenance callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(maintenanceChannel);
    }

    // Leases real-time subscription
    if (callbacks.onLeaseChange) {
      const leaseChannel = supabase
        .channel('leases-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'leases',
            filter: `or(landlord_user_id.eq.${user.id},tenant_user_id.eq.${user.id})`
          },
          (payload) => {
            console.log('📄 Lease change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onLeaseChange?.();
            } catch (error) {
              console.error('Error in lease callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(leaseChannel);
    }

    // Properties real-time subscription
    if (callbacks.onPropertyChange) {
      const propertyChannel = supabase
        .channel('properties-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'properties'
          },
          (payload) => {
            console.log('🏠 Property change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onPropertyChange?.();
            } catch (error) {
              console.error('Error in property callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(propertyChannel);
    }

    // Tenancies real-time subscription
    if (callbacks.onTenancyChange) {
      const tenancyChannel = supabase
        .channel('tenancies-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tenancies',
            filter: `or(landlord_id.eq.${user.id},tenant_id.eq.${user.id})`
          },
          (payload) => {
            console.log('🏘️ Tenancy change received:', payload);
            if (!isMountedRef.current) return;
            try {
              callbacks.onTenancyChange?.();
            } catch (error) {
              console.error('Error in tenancy callback:', error);
            }
          }
        )
        .subscribe();
      channels.push(tenancyChannel);
    }

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up real-time subscriptions');
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [user, callbacks]);

  useEffect(() => {
    isMountedRef.current = true;
    const cleanup = setupRealtimeSubscriptions();
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [setupRealtimeSubscriptions]);

  return {
    setupRealtimeSubscriptions
  };
}

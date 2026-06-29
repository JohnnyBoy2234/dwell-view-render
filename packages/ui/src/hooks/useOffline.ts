import { useState, useEffect } from 'react';
import { OfflineService } from '@mzanzihomes/ui/services/offlineService';
import { MobileServices } from '@mzanzihomes/ui/services/mobileServices';
import { useAuth } from '@mzanzihomes/supabase/hooks/useAuth';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasOfflineData, setHasOfflineData] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Initialize online status
    const checkOnlineStatus = async () => {
      if (MobileServices.isNative) {
        const status = await MobileServices.getNetworkStatus();
        setIsOnline(status.connected);
      } else {
        setIsOnline(navigator.onLine);
      }
    };

    checkOnlineStatus();

    // Listen for network changes
    if (MobileServices.isNative) {
      MobileServices.onNetworkChange((status) => {
        const wasOffline = !isOnline;
        setIsOnline(status.connected);
        
        // Process queued actions when coming back online
        if (wasOffline && status.connected) {
          OfflineService.processQueuedActions();
        }
      });
    } else {
      const handleOnline = () => {
        setIsOnline(true);
        OfflineService.processQueuedActions();
      };
      
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [isOnline]);

  useEffect(() => {
    // Cache essential data when user is available and online
    if (user && isOnline) {
      OfflineService.cacheEssentialData(user.id);
    }

    // Check if offline data is available
    setHasOfflineData(OfflineService.getCachedData() !== null);
  }, [user, isOnline]);

  const queueAction = (action: any) => {
    if (!isOnline) {
      OfflineService.queueAction(action);
      return true;
    }
    return false;
  };

  const getOfflineData = () => {
    return {
      properties: OfflineService.getOfflineProperties(),
      conversations: OfflineService.getOfflineConversations(),
      notifications: OfflineService.getOfflineNotifications()
    };
  };

  return {
    isOnline,
    hasOfflineData,
    queueAction,
    getOfflineData,
    hasOfflineProperties: OfflineService.hasOfflineProperties(),
    hasOfflineConversations: OfflineService.hasOfflineConversations()
  };
}
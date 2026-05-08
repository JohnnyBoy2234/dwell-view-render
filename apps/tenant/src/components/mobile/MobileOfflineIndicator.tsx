import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, Database } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { MobileServices } from '@/services/mobileServices';

export function MobileOfflineIndicator() {
  const { isOnline, hasOfflineData, getOfflineData } = useOffline();

  if (isOnline) return null;

  const offlineData = getOfflineData();
  const hasAnyOfflineData = hasOfflineData && (
    offlineData.properties.length > 0 || 
    offlineData.conversations.length > 0 || 
    offlineData.notifications.length > 0
  );

  const handleRetry = async () => {
    if (MobileServices.isNative) {
      const status = await MobileServices.getNetworkStatus();
      if (status.connected) {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background">
      <Alert className="rounded-none border-l-0 border-r-0 border-t-0 border-destructive bg-destructive/10">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="font-medium">You're offline</span>
            {hasAnyOfflineData ? (
              <span className="text-xs text-muted-foreground mt-1">
                <Database className="h-3 w-3 inline mr-1" />
                Limited data available offline
              </span>
            ) : (
              <span className="text-xs text-muted-foreground mt-1">
                Some features may not work
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
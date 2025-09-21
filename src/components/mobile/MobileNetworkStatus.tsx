import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';

export function MobileNetworkStatus() {
  const { isNative, networkStatus } = useMobile();

  if (!isNative || networkStatus.connected) {
    return null;
  }

  return (
    <Alert className="mx-4 mt-4 border-destructive bg-destructive/10">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>You're offline. Some features may not work properly.</span>
        <Wifi className="h-4 w-4 opacity-50" />
      </AlertDescription>
    </Alert>
  );
}
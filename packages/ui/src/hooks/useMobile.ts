import { useState, useEffect } from 'react';
import { MobileServices } from '@mzanzihomes/ui/services/mobileServices';

export function useMobile() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  const [networkStatus, setNetworkStatus] = useState({ connected: true, connectionType: 'unknown' });

  useEffect(() => {
    setIsNative(MobileServices.isMobile());
    setPlatform(MobileServices.getPlatform());

    // Initialize network status monitoring
    const initNetwork = async () => {
      const status = await MobileServices.getNetworkStatus();
      setNetworkStatus(status);

      // Listen for network changes
      MobileServices.onNetworkChange((status) => {
        setNetworkStatus(status);
      });
    };

    initNetwork();
  }, []);

  return {
    isNative,
    platform,
    isIOS: MobileServices.isIOS(),
    isAndroid: MobileServices.isAndroid(),
    networkStatus,
    services: MobileServices
  };
}
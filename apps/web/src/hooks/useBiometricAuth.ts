import { useState } from 'react';
import { MobileServices } from '@/services/mobileServices';
import { toast } from 'sonner';
import { MOBILE_AUTH_LABELS } from '@mzanzihomes/common/constants/mobileConstants';

export interface BiometricAuthConfig {
  onSuccess: () => void;
  onFallback: () => void;
}

export interface BiometricAuthResult {
  isAuthenticating: boolean;
  authenticate: () => Promise<void>;
}

/**
 * Hook to handle biometric authentication logic
 */
export function useBiometricAuth({ onSuccess, onFallback }: BiometricAuthConfig): BiometricAuthResult {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticate = async () => {
    setIsAuthenticating(true);
    
    try {
      // Check if biometric authentication is available
      const isAvailable = await MobileServices.isBiometricAvailable();
      
      if (!isAvailable) {
        toast.error(MOBILE_AUTH_LABELS.NOT_AVAILABLE);
        onFallback();
        return;
      }

      // Attempt biometric authentication
      const result = await MobileServices.authenticateWithBiometric();
      
      if (result.success) {
        await MobileServices.vibrateLight();
        toast.success(MOBILE_AUTH_LABELS.SUCCESS_MESSAGE);
        onSuccess();
      } else {
        toast.error(MOBILE_AUTH_LABELS.ERROR_MESSAGE);
        onFallback();
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      toast.error(MOBILE_AUTH_LABELS.GENERAL_ERROR);
      onFallback();
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticating,
    authenticate,
  };
}
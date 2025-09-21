import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, User, Smartphone } from 'lucide-react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';
import { toast } from 'sonner';

interface MobileAuthProps {
  onSuccess: () => void;
  onFallback: () => void;
}

export function MobileAuth({ onSuccess, onFallback }: MobileAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { isNative, isIOS, isAndroid } = useMobile();

  const handleBiometricAuth = async () => {
    if (!isNative) {
      onFallback();
      return;
    }

    setIsAuthenticating(true);
    
    try {
      // Check if biometric authentication is available
      const isAvailable = await MobileServices.isBiometricAvailable();
      
      if (!isAvailable) {
        toast.error('Biometric authentication not available');
        onFallback();
        return;
      }

      // Attempt biometric authentication
      const result = await MobileServices.authenticateWithBiometric();
      
      if (result.success) {
        await MobileServices.vibrateLight();
        toast.success('Authentication successful');
        onSuccess();
      } else {
        toast.error('Authentication failed');
        onFallback();
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      toast.error('Authentication error');
      onFallback();
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!isNative) {
    return null;
  }

  const getAuthIcon = () => {
    if (isIOS) return <User className="h-8 w-8" />;
    if (isAndroid) return <Fingerprint className="h-8 w-8" />;
    return <Smartphone className="h-8 w-8" />;
  };

  const getAuthText = () => {
    if (isIOS) return 'Use Face ID or Touch ID';
    if (isAndroid) return 'Use Fingerprint';
    return 'Use Biometric Authentication';
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {getAuthIcon()}
          Quick Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleBiometricAuth}
          disabled={isAuthenticating}
          className="w-full"
          size="lg"
        >
          {isAuthenticating ? 'Authenticating...' : getAuthText()}
        </Button>
        <Button
          variant="outline"
          onClick={onFallback}
          className="w-full"
        >
          Use Password Instead
        </Button>
      </CardContent>
    </Card>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMobile } from '@/hooks/useMobile';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { MobileAuthIcon } from './MobileAuthIcon';
import { MOBILE_AUTH_LABELS, PLATFORM_AUTH_TEXT, MOBILE_ARIA_LABELS } from '@mzanzihomes/common/constants/mobileConstants';

interface MobileAuthProps {
  onSuccess: () => void;
  onFallback: () => void;
}

/**
 * Mobile biometric authentication component
 * Handles platform-specific biometric authentication with proper fallbacks
 */
export function MobileAuth({ onSuccess, onFallback }: MobileAuthProps) {
  const { isNative, isIOS, isAndroid } = useMobile();
  const { isAuthenticating, authenticate } = useBiometricAuth({ onSuccess, onFallback });

  if (!isNative) {
    return null;
  }

  const getAuthText = () => {
    if (isIOS) return PLATFORM_AUTH_TEXT.IOS;
    if (isAndroid) return PLATFORM_AUTH_TEXT.ANDROID;
    return PLATFORM_AUTH_TEXT.DEFAULT;
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MobileAuthIcon />
          {MOBILE_AUTH_LABELS.TITLE}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={authenticate}
          disabled={isAuthenticating}
          className="w-full"
          size="lg"
          aria-label={MOBILE_ARIA_LABELS.AUTH_BUTTON}
        >
          {isAuthenticating ? MOBILE_AUTH_LABELS.AUTHENTICATING : getAuthText()}
        </Button>
        <Button
          variant="outline"
          onClick={onFallback}
          className="w-full"
          aria-label={MOBILE_ARIA_LABELS.FALLBACK_BUTTON}
        >
          {MOBILE_AUTH_LABELS.FALLBACK_BUTTON}
        </Button>
      </CardContent>
    </Card>
  );
}
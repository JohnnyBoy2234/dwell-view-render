import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mzanzihomes/ui/components/button';
import { ArrowLeft } from 'lucide-react';
import { MobileServices } from '@mzanzihomes/ui/services/mobileServices';
import { useMobile } from '@mzanzihomes/ui/hooks/useMobile';

interface MobileBackButtonProps {
  fallbackPath?: string;
  onBack?: () => void;
  className?: string;
}

export function MobileBackButton({ fallbackPath = '/', onBack, className }: MobileBackButtonProps) {
  const navigate = useNavigate();
  const { isNative } = useMobile();

  const handleBack = async () => {
    // Haptic feedback on native
    if (isNative) {
      await MobileServices.vibrateLight();
    }

    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  );
}
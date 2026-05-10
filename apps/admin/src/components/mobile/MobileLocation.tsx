import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { MobileServices } from '@/services/mobileServices';
import { useMobile } from '@/hooks/useMobile';
import { toast } from 'sonner';

interface MobileLocationProps {
  onLocationFound: (location: { latitude: number; longitude: number; accuracy?: number }) => void;
  children?: React.ReactNode;
}

export function MobileLocation({ onLocationFound, children }: MobileLocationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { isNative } = useMobile();

  const handleGetLocation = async () => {
    setIsLoading(true);
    
    try {
      const result = await MobileServices.getCurrentLocation();
      
      if (result.success) {
        onLocationFound({
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: result.accuracy
        });
        await MobileServices.vibrateLight();
        toast.success('Location found successfully');
      } else {
        toast.error('Failed to get location. Please check your location settings.');
      }
    } catch (error) {
      console.error('Location error:', error);
      toast.error('Location access failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isNative) {
    return children || null;
  }

  return (
    <Button 
      onClick={handleGetLocation} 
      disabled={isLoading}
      variant="outline" 
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="h-4 w-4" />
      )}
      {isLoading ? 'Getting Location...' : 'Use Current Location'}
    </Button>
  );
}
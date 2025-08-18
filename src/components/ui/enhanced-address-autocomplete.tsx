import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  className?: string;
}

// Augment the global Window interface
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

export const EnhancedAddressAutocomplete: React.FC<EnhancedAddressAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter location...",
  className
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadGoogleMapsScript = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for it to load
        const checkLoaded = () => {
          if (window.google && window.google.maps && window.google.maps.places) {
            setIsLoaded(true);
            setIsLoading(false);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Create callback function
      window.initGoogleMaps = () => {
        setIsLoaded(true);
        setIsLoading(false);
      };

      // Load the script
      const script = document.createElement('script');
      const apiKey = 'AIzaSyD3O517GFrpVdcapL4PXKA_6FDo14IpcCk';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setHasError(true);
        setIsLoading(false);
        console.warn('Failed to load Google Maps API. Using fallback input.');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      // Initialize autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(regions)'],
        componentRestrictions: { country: 'za' }, // Restrict to South Africa
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
      });

      autocompleteRef.current = autocomplete;

      // Listen for place selection
      const placeChangedListener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          onChange(place.formatted_address);
          onPlaceSelect?.(place);
        }
      });

      return () => {
        if (window.google && window.google.maps && window.google.maps.event) {
          window.google.maps.event.removeListener(placeChangedListener);
        }
      };
    } catch (error) {
      console.warn('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (hasError) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className={cn("pl-10", className)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
      {isLoading && (
        <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin z-10" />
      )}
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        className={cn("pl-10 pr-10", className)}
        disabled={isLoading}
      />
    </div>
  );
};
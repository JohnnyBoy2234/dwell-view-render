import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      try {
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

        // Use the official Google Maps JS API Loader for proper async loading
        const loader = new Loader({
          apiKey: 'AIzaSyD3O517GFrpVdcapL4PXKA_6FDo14IpcCk',
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        setIsLoaded(true);
        setIsLoading(false);
      } catch (error) {
        console.warn('Failed to load Google Maps API:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    loadGoogleMapsAPI();
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    try {
      // Use the new PlaceAutocompleteElement
      const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'za' }, // Restrict to South Africa
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
        types: ['(regions)']
      });

      // Style the autocomplete element
      autocompleteElement.className = 'w-full h-10 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 border border-input bg-background pl-10 pr-10 rounded-md';
      autocompleteElement.placeholder = placeholder;

      // Clear the container and add the autocomplete element
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(autocompleteElement);

      autocompleteRef.current = autocompleteElement;

      // Listen for place selection
      autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
        const place = event.place;
        if (place.formattedAddress) {
          onChange(place.formattedAddress);
          onPlaceSelect?.(place);
        }
      });

      return () => {
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    } catch (error) {
      console.warn('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect, placeholder]);

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

  if (isLoading) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
        <Loader2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground animate-spin z-10" />
        <Input
          type="text"
          placeholder={placeholder}
          disabled
          className={cn("pl-10 pr-10", className)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
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
          apiKey: 'AIzaSyC_a8w6Cm-PlyJ2eSpXyyp6VeyFkl-CcMI',
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
        types: ['geocode'] // Real-world addresses like cities, suburbs, streets
      });

      // Apply comprehensive styling for theme consistency and visibility
      const baseClasses = 'w-full px-3 py-2 text-base md:text-sm font-medium bg-background text-foreground border border-input rounded-md transition-all duration-300 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ocean-blue focus:border-ocean-blue hover:border-ocean-blue/50 disabled:cursor-not-allowed disabled:opacity-50';
      const heightClass = className?.includes('h-12') ? 'h-12' : 'h-10';
      const paddingClass = className?.includes('pl-10') ? 'pl-10' : 'px-3';
      
      autocompleteElement.className = `${baseClasses} ${heightClass} ${paddingClass}`;
      autocompleteElement.placeholder = placeholder;
      
      // Apply additional inline styles for better visibility and mobile optimization
      autocompleteElement.style.fontSize = window.innerWidth < 768 ? '16px' : '14px'; // Prevent zoom on iOS
      autocompleteElement.style.color = 'hsl(var(--foreground))';
      autocompleteElement.style.backgroundColor = 'hsl(var(--background))';
      autocompleteElement.style.borderColor = 'hsl(var(--input))';
      autocompleteElement.style.zIndex = '10';

      // Clear the container and add the autocomplete element
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(autocompleteElement);

      autocompleteRef.current = autocompleteElement;

      // Listen for place selection
      autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
        const place = event.place;
        if (place?.formattedAddress) {
          onChange(place.formattedAddress);
          onPlaceSelect?.(place);
        }
      });

      // Style the autocomplete dropdown for better visibility and theme consistency
      const observer = new MutationObserver(() => {
        const dropdown = document.querySelector('.pac-container');
        if (dropdown) {
          dropdown.setAttribute('style', `
            background: hsl(var(--popover)) !important;
            border: 1px solid hsl(var(--border)) !important;
            border-radius: 8px !important;
            box-shadow: 0 8px 30px -8px hsl(var(--ocean-blue) / 0.18) !important;
            z-index: 9999 !important;
            margin-top: 4px !important;
            max-height: 300px !important;
            overflow-y: auto !important;
          `);
          
          const items = dropdown.querySelectorAll('.pac-item');
          items.forEach((item: any) => {
            item.style.color = 'hsl(var(--foreground))';
            item.style.padding = '12px 16px';
            item.style.borderBottom = '1px solid hsl(var(--border))';
            item.style.fontSize = '14px';
            item.style.fontWeight = '400';
            
            item.addEventListener('mouseenter', () => {
              item.style.backgroundColor = 'hsl(var(--accent) / 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
              item.style.backgroundColor = 'transparent';
            });
          });
          
          observer.disconnect();
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });

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
      <MapPin className={cn(
        "absolute left-3 h-4 w-4 text-muted-foreground z-10 pointer-events-none",
        className?.includes('h-12') ? 'top-4' : 'top-3'
      )} />
      <div ref={containerRef} className="w-full" />
    </div>
  );
};
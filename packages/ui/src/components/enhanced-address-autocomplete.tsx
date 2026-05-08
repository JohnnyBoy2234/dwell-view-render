import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export const EnhancedAddressAutocomplete: React.FC<EnhancedAddressAutocompleteProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter location...",
  className,
  onClear
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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

  const handleClear = () => {
    onChange('');
    onClear?.();
    // Clear the autocomplete element if it exists
    if (autocompleteRef.current) {
      autocompleteRef.current.value = '';
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    try {
      // Use the new PlaceAutocompleteElement
      const autocompleteElement = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'za' }, // Restrict to South Africa
        types: ['geocode'] // Real-world addresses like cities, suburbs, streets
      });

      // Apply Property24-style classes
      autocompleteElement.className = `property24-search-input w-full ${className || ''}`;
      autocompleteElement.placeholder = placeholder;
      
      // Set initial value only if not empty
      if (value) {
        autocompleteElement.value = value;
      }
      
      // Apply additional inline styles for Property24 look
      autocompleteElement.style.fontSize = window.innerWidth < 768 ? '16px' : '16px';
      autocompleteElement.style.fontWeight = '400';
      autocompleteElement.style.color = 'hsl(var(--foreground))';
      autocompleteElement.style.backgroundColor = 'white';
      autocompleteElement.style.borderColor = 'hsl(var(--border))';
      autocompleteElement.style.borderWidth = '2px';
      autocompleteElement.style.borderRadius = '16px';
      autocompleteElement.style.height = '56px';
      autocompleteElement.style.paddingLeft = '48px';
      autocompleteElement.style.paddingRight = value ? '48px' : '16px';

      // Clear the container and add the autocomplete element
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(autocompleteElement);

      autocompleteRef.current = autocompleteElement;

      // Focus and blur event handlers
      autocompleteElement.addEventListener('focus', () => setIsFocused(true));
      autocompleteElement.addEventListener('blur', () => setIsFocused(false));

      // Listen for input changes - let the user type freely
      autocompleteElement.addEventListener('input', (event: any) => {
        const inputValue = event.target.value;
        onChange(inputValue);
      });

      // Listen for place selection
      autocompleteElement.addEventListener('gmp-placeselect', (event: any) => {
        const place = event.place;
        if (place?.formattedAddress) {
          onChange(place.formattedAddress);
          onPlaceSelect?.(place);
        }
      });

      // Style the autocomplete dropdown for Property24 look
      const observer = new MutationObserver(() => {
        const dropdown = document.querySelector('.pac-container');
        if (dropdown && !dropdown.hasAttribute('data-property24-styled')) {
          dropdown.setAttribute('data-property24-styled', 'true');
          (dropdown as HTMLElement).style.cssText = `
            background: white !important;
            border: 1px solid hsl(var(--border)) !important;
            border-radius: 16px !important;
            box-shadow: 0 16px 32px -8px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
            margin-top: 8px !important;
            overflow: hidden !important;
            z-index: 10000 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            min-width: 320px !important;
            max-width: 500px !important;
          `;
          
          const items = dropdown.querySelectorAll('.pac-item');
          items.forEach((item: any, index: number) => {
            item.style.cssText = `
              padding: 16px 20px !important;
              border-bottom: ${index === items.length - 1 ? 'none' : '1px solid hsl(var(--border) / 0.5)'} !important;
              font-size: 15px !important;
              color: hsl(var(--foreground)) !important;
              cursor: pointer !important;
              transition: all 0.2s ease !important;
              line-height: 1.4 !important;
              font-weight: 400 !important;
            `;
            
            item.addEventListener('mouseenter', () => {
              item.style.backgroundColor = 'hsl(var(--ocean-blue) / 0.06)';
              item.style.color = 'hsl(var(--ocean-blue))';
            });
            
            item.addEventListener('mouseleave', () => {
              item.style.backgroundColor = 'transparent';
              item.style.color = 'hsl(var(--foreground))';
            });
          });
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
        if (autocompleteRef.current) {
          autocompleteRef.current.removeEventListener('input', () => {});
          autocompleteRef.current.removeEventListener('gmp-placeselect', () => {});
          autocompleteRef.current.removeEventListener('focus', () => {});
          autocompleteRef.current.removeEventListener('blur', () => {});
        }
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      };
    } catch (error) {
      console.warn('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect, placeholder]);

  // Sync external value changes to the autocomplete element
  useEffect(() => {
    if (autocompleteRef.current && autocompleteRef.current.value !== value) {
      autocompleteRef.current.value = value;
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  if (hasError) {
    // Fallback to regular input if Google Maps fails to load
    return (
      <div className="relative group">
        <MapPin className="absolute left-4 top-4 h-5 w-5 text-ocean-blue/60 z-10" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn("property24-search-input pl-12 pr-12", className, {
            'property24-search-input-focused': isFocused
          })}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-4 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative">
        <MapPin className="absolute left-4 top-4 h-5 w-5 text-ocean-blue/40 z-10" />
        <Loader2 className="absolute right-4 top-4 h-5 w-5 text-ocean-blue/40 animate-spin z-10" />
        <Input
          type="text"
          placeholder="Loading Google Maps..."
          disabled
          className={cn("property24-search-input pl-12 pr-12", className)}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      <MapPin className={cn(
        "absolute left-4 h-5 w-5 text-ocean-blue/60 z-10 pointer-events-none top-4"
      )} />
      <div ref={containerRef} className="w-full" />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-4 top-4 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
          type="button"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
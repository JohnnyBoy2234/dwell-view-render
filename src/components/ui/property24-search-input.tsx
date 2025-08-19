import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Property24SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  disabled?: boolean;
}

export const Property24SearchInput: React.FC<Property24SearchInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search by city, suburb or street...",
  className,
  onClear,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    let isMounted = true;

    const loadGoogleMapsAPI = async () => {
      try {
        if (window.google?.maps?.places?.PlaceAutocompleteElement) {
          if (isMounted) {
            setIsLoaded(true);
            setIsLoading(false);
          }
          return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key is not configured');
          if (isMounted) {
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        
        if (isMounted) {
          setIsLoaded(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Google Maps API:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadGoogleMapsAPI();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !containerRef.current || disabled || hasError) return;

    try {
      console.log('Creating PlaceAutocompleteElement with updated config...');
      
      // Create the new PlaceAutocompleteElement with only supported properties
      const autocomplete = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'za' },
        types: ['geocode']
      });
      
      console.log('PlaceAutocompleteElement created successfully');

      autocompleteRef.current = autocomplete;

      // Apply Property24 styling
      autocomplete.style.width = '100%';
      autocomplete.style.height = '52px';
      autocomplete.style.border = '1px solid hsl(var(--border))';
      autocomplete.style.borderRadius = '8px';
      autocomplete.style.backgroundColor = 'hsl(var(--background))';
      autocomplete.style.color = 'hsl(var(--foreground))';
      autocomplete.style.fontSize = '14px';
      autocomplete.style.paddingLeft = '48px';
      autocomplete.style.paddingRight = '48px';
      autocomplete.style.outline = 'none';
      autocomplete.style.transition = 'all 0.2s ease-in-out';

      // Set placeholder
      autocomplete.placeholder = placeholder;

      // Set initial value if provided
      if (value) {
        autocomplete.value = value;
      }

      // Event listeners
      autocomplete.addEventListener('gmp-placeselect', (event: any) => {
        console.log('Place selected from autocomplete:', event.place);
        const place = event.place;
        if (place && place.formattedAddress) {
          console.log('Updating search term with:', place.formattedAddress);
          onChange(place.formattedAddress);
          onPlaceSelect?.(place);
        }
      });

      autocomplete.addEventListener('input', (event: any) => {
        onChange(event.target.value);
      });

      autocomplete.addEventListener('focus', () => {
        setIsFocused(true);
        autocomplete.style.borderColor = 'hsl(var(--ocean-blue))';
        autocomplete.style.boxShadow = '0 0 0 2px hsl(var(--ocean-blue) / 0.2)';
      });

      autocomplete.addEventListener('blur', () => {
        setIsFocused(false);
        autocomplete.style.borderColor = 'hsl(var(--border))';
        autocomplete.style.boxShadow = 'none';
      });

      autocomplete.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          autocomplete.blur();
        }
      });

      // Mount the autocomplete element
      containerRef.current.appendChild(autocomplete);

      return () => {
        if (autocompleteRef.current && containerRef.current?.contains(autocompleteRef.current)) {
          containerRef.current.removeChild(autocompleteRef.current);
        }
        autocompleteRef.current = null;
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect, disabled, hasError, placeholder]);

  // Sync external value changes with autocomplete
  useEffect(() => {
    if (autocompleteRef.current && autocompleteRef.current.value !== value) {
      autocompleteRef.current.value = value;
    }
  }, [value]);

  const handleClear = () => {
    onChange('');
    onClear?.();
    if (autocompleteRef.current) {
      autocompleteRef.current.value = '';
      autocompleteRef.current.focus();
    }
  };

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

  if (hasError) {
    return (
      <div className="relative group">
        <MapPin className="absolute left-4 top-4 h-5 w-5 text-ocean-blue/60 z-10" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => e.key === 'Escape' && e.currentTarget.blur()}
          disabled={disabled}
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

  return (
    <div className="relative group">
      <MapPin className={cn(
        "absolute left-4 top-4 h-5 w-5 text-ocean-blue/60 z-10 pointer-events-none transition-colors",
        isFocused && "text-ocean-blue"
      )} />
      <div 
        ref={containerRef}
        className={cn("property24-search-input", className)}
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
};
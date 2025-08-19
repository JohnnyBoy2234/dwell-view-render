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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    let isMounted = true;

    const loadGoogleMapsAPI = async () => {
      try {
        if (window.google?.maps?.places) {
          if (isMounted) {
            setIsLoaded(true);
            setIsLoading(false);
          }
          return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key is not configured:', apiKey);
          if (isMounted) {
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }

        console.log('Loading Google Maps API...');
        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        await loader.load();
        console.log('Google Maps API loaded successfully');
        
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
    if (!isLoaded || !inputRef.current || disabled) return;

    let autocomplete: any = null;

    try {
      console.log('Initializing Google Places Autocomplete...');
      
      autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'za' },
        fields: ['formatted_address', 'geometry', 'name', 'place_id']
      });

      // Listen for place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete!.getPlace();
        console.log('Place selected:', place);
        
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
          onPlaceSelect?.(place);
        }
      });

      // Simple dropdown styling
      const observer = new MutationObserver(() => {
        const dropdown = document.querySelector('.pac-container') as HTMLElement;
        if (dropdown && !dropdown.hasAttribute('data-styled')) {
          dropdown.setAttribute('data-styled', 'true');
          dropdown.style.zIndex = '10000';
          dropdown.style.borderRadius = '8px';
          dropdown.style.border = '1px solid hsl(var(--border))';
          dropdown.style.backgroundColor = 'hsl(var(--background))';
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        if (autocomplete) {
          window.google.maps.event.clearInstanceListeners(autocomplete);
        }
        observer.disconnect();
      };
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect, disabled]);

  const handleClear = () => {
    onChange('');
    onClear?.();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      inputRef.current?.blur();
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
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoComplete="off"
        className={cn(
          "property24-search-input pl-12 pr-12",
          className,
          {
            'property24-search-input-focused': isFocused
          }
        )}
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
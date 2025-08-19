import React, { useEffect, useRef, useState, useCallback } from 'react';
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

// Google Maps types are already declared globally

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
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMapsAPI = async () => {
      try {
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          setIsLoading(false);
          return;
        }

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

  // Clear function
  const handleClear = useCallback(() => {
    onChange('');
    onClear?.();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onChange, onClear]);

  // Initialize autocomplete when ready
  useEffect(() => {
    if (!isLoaded || !inputRef.current || disabled) return;

    try {
      // Create traditional autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'za' },
        fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
      });

      autocompleteRef.current = autocomplete;

      // Listen for place selection
      const placeChangedListener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.formatted_address) {
          setIsSelectingPlace(true);
          setIsTyping(false);
          
          // Update input directly and call callbacks
          if (inputRef.current) {
            inputRef.current.value = place.formatted_address;
          }
          onChange(place.formatted_address);
          onPlaceSelect?.(place);
          
          // Reset selecting state after a brief delay
          setTimeout(() => setIsSelectingPlace(false), 100);
        }
      });

      // Style the autocomplete dropdown
      const styleDropdown = () => {
        const dropdown = document.querySelector('.pac-container') as HTMLElement;
        if (dropdown && !dropdown.hasAttribute('data-styled')) {
          dropdown.setAttribute('data-styled', 'true');
          dropdown.style.cssText = `
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
      };

      // Observer to style dropdown when it appears
      const observer = new MutationObserver(styleDropdown);
      observer.observe(document.body, { childList: true, subtree: true });

      return () => {
        window.google.maps.event.clearInstanceListeners(autocomplete);
        observer.disconnect();
      };
    } catch (error) {
      console.warn('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }
  }, [isLoaded, onChange, onPlaceSelect, disabled]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't process input changes if we're in the middle of selecting a place
    if (isSelectingPlace) return;
    
    const newValue = e.target.value;
    setIsTyping(true);
    onChange(newValue);
  };

  // Handle focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle blur
  const handleBlur = () => {
    setIsFocused(false);
    // Delay to allow place selection
    setTimeout(() => setIsTyping(false), 200);
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
            'property24-search-input-focused': isFocused,
            'property24-search-input-typing': isTyping
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
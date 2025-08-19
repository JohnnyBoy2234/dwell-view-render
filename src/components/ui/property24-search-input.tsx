import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { MapPin, X } from 'lucide-react';
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

  // Load Google Maps API
  useEffect(() => {
    let isMounted = true;

    const loadGoogleMapsAPI = async () => {
      try {
        // Check if already loaded
        if (window.google && window.google.maps && window.google.maps.places?.PlaceAutocompleteElement) {
          if (isMounted) {
            setIsLoaded(true);
            setIsLoading(false);
          }
          return;
        }

        const apiKey = 'AIzaSyC_a8w6Cm-PlyJ2eSpXyyp6VeyFkl-CcMI';
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
    if (!isLoaded || !containerRef.current || disabled) return;

    let autocomplete: any = null;
    let observer: MutationObserver | null = null;

    try {
      // Create the PlaceAutocompleteElement
      autocomplete = new window.google.maps.places.PlaceAutocompleteElement({
        componentRestrictions: { country: 'za' },
        types: ['geocode']
      });

      // Apply className first
      if (className) {
        autocomplete.className = className;
      }

      // Apply inline styles for Property24 design
      autocomplete.style.cssText = `
        width: 100%;
        height: 52px;
        border: 1px solid hsl(var(--border));
        border-radius: 8px;
        background-color: hsl(var(--background));
        color: hsl(var(--foreground));
        font-size: 14px;
        padding-left: 48px;
        padding-right: 48px;
        outline: none;
        transition: all 0.2s ease-in-out;
        font-family: inherit;
      `;

      // Set placeholder
      autocomplete.placeholder = placeholder;

      // Set initial value if provided
      if (value) {
        autocomplete.value = value;
      }

      // Clear container and append
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(autocomplete);
      autocompleteRef.current = autocomplete;

      // Focus event
      const handleFocus = () => {
        autocomplete.style.borderColor = 'hsl(var(--ocean-blue))';
        autocomplete.style.boxShadow = '0 0 0 2px hsl(var(--ocean-blue) / 0.2)';
      };

      // Blur event
      const handleBlur = () => {
        autocomplete.style.borderColor = 'hsl(var(--border))';
        autocomplete.style.boxShadow = 'none';
      };

      // Input event
      const handleInput = (event: any) => {
        onChange(event.target.value);
      };

      // Place select event
      const handlePlaceSelect = (event: any) => {
        const place = event.place;
        if (place?.formattedAddress) {
          onChange(place.formattedAddress);
          onPlaceSelect?.(place);
        }
      };

      // Keyboard events
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          autocomplete.blur();
        }
      };

      // Add event listeners
      autocomplete.addEventListener('focus', handleFocus);
      autocomplete.addEventListener('blur', handleBlur);
      autocomplete.addEventListener('input', handleInput);
      autocomplete.addEventListener('gmp-placeselect', handlePlaceSelect);
      autocomplete.addEventListener('keydown', handleKeyDown);

      // Style the dropdown suggestions using MutationObserver
      observer = new MutationObserver(() => {
        const containers = document.querySelectorAll('.pac-container');
        containers.forEach((container) => {
          if (container instanceof HTMLElement) {
            container.style.cssText = `
              background-color: hsl(var(--background));
              border: 1px solid hsl(var(--border));
              border-radius: 8px;
              color: hsl(var(--foreground));
              font-size: 14px;
              box-shadow: 0 4px 12px hsl(var(--shadow) / 0.15);
              z-index: 9999;
              margin-top: 4px;
            `;
          }

          const items = container.querySelectorAll('.pac-item');
          items.forEach((item) => {
            if (item instanceof HTMLElement) {
              item.style.cssText = `
                background-color: hsl(var(--background));
                color: hsl(var(--foreground));
                padding: 12px 16px;
                border-bottom: 1px solid hsl(var(--border));
                cursor: pointer;
                transition: background-color 0.2s ease;
              `;

              // Remove existing listeners to avoid duplicates
              const handleMouseEnter = () => {
                item.style.backgroundColor = 'hsl(var(--muted))';
              };
              const handleMouseLeave = () => {
                item.style.backgroundColor = 'hsl(var(--background))';
              };

              item.addEventListener('mouseenter', handleMouseEnter);
              item.addEventListener('mouseleave', handleMouseLeave);
            }
          });
        });
      });

      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
      setHasError(true);
    }

    // Cleanup function
    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (autocomplete) {
        autocomplete.remove();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      autocompleteRef.current = null;
    };
  }, [isLoaded, onChange, onPlaceSelect, disabled, placeholder, className]);

  // Sync external value changes
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

  if (hasError) {
    return (
      <div className="relative group">
        <MapPin className="absolute left-4 top-4 h-5 w-5 text-ocean-blue/60 z-10" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn("property24-search-input pl-12 pr-12", className)}
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
        <Input
          type="text"
          placeholder="Loading..."
          disabled
          className={cn("property24-search-input pl-12 pr-12", className)}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      <MapPin className="absolute left-4 top-4 h-5 w-5 text-ocean-blue/60 z-10 pointer-events-none transition-colors" />
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
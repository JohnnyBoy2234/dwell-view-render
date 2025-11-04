import { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Google Maps types imported from types file
interface Property24SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: any) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
  disabled?: boolean;
}

interface GooglePlacesResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export const Property24SearchInput: React.FC<Property24SearchInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search by city, suburb",
  className,
  onClear,
  disabled = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<GooglePlacesResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const placesService = useRef<any>(null);

  // Initialize Google Places API
  useEffect(() => {
    const initializePlaces = async () => {
      try {
        console.log('🔄 Initializing Google Places API...');
        
        // Check if already loaded
        if (window.google?.maps?.places) {
          console.log('✅ Google Maps API already loaded, creating service...');
          placesService.current = new window.google.maps.places.AutocompleteService();
          console.log('✅ AutocompleteService created successfully');
          return;
        }

        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        console.log('🔑 API Key found:', apiKey ? 'Yes' : 'No');
        
        if (!apiKey) {
          console.error('❌ Google Maps API key not found in environment variables');
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          console.log('📜 Google Maps script already exists, waiting for places...');
          await waitForGooglePlaces();
          return;
        }

        console.log('📜 Loading Google Maps script with callback...');
        
        // Create unique callback name
        const callbackName = `initGoogleMaps_${Date.now()}`;
        
        // Create callback function
        (window as any)[callbackName] = () => {
          console.log('🎯 Google Maps callback triggered');
          waitForGooglePlaces().then(() => {
            // Clean up the global callback
            delete (window as any)[callbackName];
          });
        };
        
        // Load Google Maps script with callback
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
        script.async = true;
        script.defer = true;
        
        script.onerror = (error) => {
          console.error('❌ Failed to load Google Maps script:', error);
          delete (window as any)[callbackName];
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error initializing Google Places:', error);
      }
    };

    // Function to wait for Google Places to be available
    const waitForGooglePlaces = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        console.log('⏳ Waiting for Google Places to be available...');
        
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds with 100ms intervals
        
        const checkInterval = setInterval(() => {
          attempts++;
          
          if (window.google?.maps?.places?.AutocompleteService) {
            console.log('✅ Google Places available! Creating service...');
            clearInterval(checkInterval);
            
            try {
              placesService.current = new window.google.maps.places.AutocompleteService();
              console.log('✅ AutocompleteService created successfully');
              resolve();
            } catch (error) {
              console.error('❌ Error creating AutocompleteService:', error);
              reject(error);
            }
          } else if (attempts >= maxAttempts) {
            console.error('❌ Timeout waiting for Google Places API');
            clearInterval(checkInterval);
            reject(new Error('Timeout waiting for Google Places API'));
          } else {
            console.log(`⏳ Still waiting... (attempt ${attempts}/${maxAttempts})`);
          }
        }, 100);
      });
    };

    initializePlaces();
  }, []);

  // Handle input changes and fetch suggestions
  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    setSelectedIndex(-1);

    console.log('🔍 Input changed:', inputValue);
    console.log('🔍 Service available:', !!placesService.current);

    if (!inputValue.trim()) {
      console.log('🔍 Empty input, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!placesService.current) {
      console.log('⚠️ Places service not ready yet');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (inputValue.length < 2) {
      console.log('🔍 Input too short, waiting for more characters');
      return;
    }

    setIsLoading(true);
    console.log('🔄 Fetching predictions for:', inputValue);

    try {
      const request = {
        input: inputValue,
        componentRestrictions: { country: 'za' },
        types: ['geocode']
      };

      placesService.current.getPlacePredictions(request, (results, status) => {
        console.log('📍 Predictions response - Status:', status, 'Results count:', results?.length || 0);
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          console.log('✅ Setting suggestions:', results);
          setSuggestions(results);
          setShowSuggestions(true);
        } else {
          console.log('❌ No valid results - Status:', status);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('❌ Error fetching place predictions:', error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: GooglePlacesResult) => {
    onChange(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    // Get place details if callback provided
    if (onPlaceSelect) {
      const placesDetailService = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
      
      placesDetailService.getDetails(
        { placeId: suggestion.place_id },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            onPlaceSelect({
              place_id: suggestion.place_id,
              formattedAddress: suggestion.description,
              geometry: place.geometry,
              name: place.name,
              types: place.types
            });
          }
        }
      );
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle clear button
  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    onClear?.();
    inputRef.current?.focus();
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative group">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 pointer-events-none" />
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full h-12 pl-12 pr-12 rounded-lg border border-border bg-background",
            "text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            "hover:border-muted-foreground/50 transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "text-sm font-medium",
            className
          )}
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                "border-b border-border last:border-b-0",
                "focus:outline-none focus:bg-muted/50",
                selectedIndex === index && "bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-foreground truncate">
                    {suggestion.structured_formatting.main_text}
                  </div>
                  {suggestion.structured_formatting.secondary_text && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
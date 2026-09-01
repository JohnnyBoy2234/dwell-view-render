import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@mzanzihomes/ui/components/input';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps } from '@mzanzihomes/ui/utils/googleMaps';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onPlaceSelect?: (place: any) => void;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter address...",
  className = "",
  onPlaceSelect
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);

  // Update refs when props change
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then(() => { if (active) setIsLoaded(true); })
      .catch((e) => {
        // Missing key or load failure — the field still works as a plain text
        // input; suggestions just won't appear. VITE_GOOGLE_MAPS_API_KEY must be
        // set at build time (.env / CI env), not in Supabase.
        console.error('Address autocomplete unavailable:', e?.message || e);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'za' }, // Restrict to South Africa
          fields: ['formatted_address', 'geometry', 'name', 'place_id', 'address_components']
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        console.log('Place selected:', place);
        if (place && place.formatted_address) {
          console.log('Setting address to:', place.formatted_address);
          onChangeRef.current(place.formatted_address);
          onPlaceSelectRef.current?.(place);
        }
      });
    } catch (error) {
      console.error('Error initializing Google Places Autocomplete:', error);
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChangeRef.current(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
      <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
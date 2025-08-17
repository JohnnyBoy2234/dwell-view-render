import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  size_sqm: number | null;
  furnished: boolean;
  pets_allowed: boolean;
  images: string[];
  amenities: string[];
  status: string;
  featured: boolean;
  created_at: string;
}

interface SearchFilters {
  searchTerm: string;
  propertyType: string;
  priceRange: [number, number];
  bedrooms: string;
  bathrooms: string;
  selectedAmenities: string[];
  furnished: boolean;
  petsAllowed: boolean;
}

export function usePropertySearch(properties: Property[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: searchParams.get('search') || '',
    propertyType: searchParams.get('type') || 'All',
    priceRange: [
      parseInt(searchParams.get('minPrice') || '0'),
      parseInt(searchParams.get('maxPrice') || '100000')
    ],
    bedrooms: searchParams.get('bedrooms') || 'Any',
    bathrooms: searchParams.get('bathrooms') || 'Any',
    selectedAmenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
    furnished: searchParams.get('furnished') === 'true',
    petsAllowed: searchParams.get('pets') === 'true',
  });

  // Update URL parameters when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    if (filters.propertyType !== 'All') params.set('type', filters.propertyType);
    if (filters.priceRange[0] > 0) params.set('minPrice', filters.priceRange[0].toString());
    if (filters.priceRange[1] < 100000) params.set('maxPrice', filters.priceRange[1].toString());
    if (filters.bedrooms !== 'Any') params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms !== 'Any') params.set('bathrooms', filters.bathrooms);
    if (filters.selectedAmenities.length > 0) params.set('amenities', filters.selectedAmenities.join(','));
    if (filters.furnished) params.set('furnished', 'true');
    if (filters.petsAllowed) params.set('pets', 'true');
    
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Filter properties based on current filters
  const filteredProperties = properties.filter(property => {
    // Search term filter (case-insensitive, partial matches)
    if (filters.searchTerm && 
        !property.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) &&
        !property.location.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
      return false;
    }

    // Property type filter
    if (filters.propertyType !== 'All' && property.property_type !== filters.propertyType) {
      return false;
    }

    // Price range filter
    if (property.price < filters.priceRange[0] || property.price > filters.priceRange[1]) {
      return false;
    }

    // Bedrooms filter
    if (filters.bedrooms !== 'Any' && property.bedrooms !== parseInt(filters.bedrooms)) {
      return false;
    }

    // Bathrooms filter
    if (filters.bathrooms !== 'Any' && property.bathrooms !== parseInt(filters.bathrooms)) {
      return false;
    }

    // Amenities filter
    if (filters.selectedAmenities.length > 0 && 
        !filters.selectedAmenities.every(amenity => property.amenities?.includes(amenity))) {
      return false;
    }

    // Furnished filter
    if (filters.furnished && !property.furnished) {
      return false;
    }

    // Pets allowed filter
    if (filters.petsAllowed && !property.pets_allowed) {
      return false;
    }

    return true;
  });

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      propertyType: 'All',
      priceRange: [0, 100000],
      bedrooms: 'Any',
      bathrooms: 'Any',
      selectedAmenities: [],
      furnished: false,
      petsAllowed: false,
    });
    setSearchParams(new URLSearchParams());
  };

  return {
    filters,
    filteredProperties,
    updateFilters,
    clearFilters,
  };
}
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export interface PropertySearchFilters {
  // Main search bar filters
  location: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  
  // Advanced modal filters
  propertyTypes: string[];
  amenities: string[];
  availableFrom: Date | null;
}

const defaultFilters: PropertySearchFilters = {
  location: '',
  minPrice: '',
  maxPrice: '',
  bedrooms: 'Any',
  bathrooms: 'Any',
  propertyTypes: [],
  amenities: [],
  availableFrom: null,
};

export function usePropertySearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<PropertySearchFilters>(() => {
    return {
      location: searchParams.get('location') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      bedrooms: searchParams.get('bedrooms') || 'Any',
      bathrooms: searchParams.get('bathrooms') || 'Any',
      propertyTypes: searchParams.get('propertyTypes')?.split(',').filter(Boolean) || [],
      amenities: searchParams.get('amenities')?.split(',').filter(Boolean) || [],
      availableFrom: searchParams.get('availableFrom') ? new Date(searchParams.get('availableFrom')!) : null,
    };
  });

  // Update filters
  const updateFilters = (newFilters: Partial<PropertySearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  // Perform search and navigate to properties page
  const executeSearch = () => {
    const params = new URLSearchParams();
    
    // Only add non-empty/non-default values to URL
    if (filters.location.trim()) {
      params.set('location', filters.location.trim());
    }
    
    if (filters.minPrice && filters.minPrice !== '0') {
      params.set('minPrice', filters.minPrice);
    }
    
    if (filters.maxPrice) {
      params.set('maxPrice', filters.maxPrice);
    }
    
    if (filters.bedrooms !== 'Any') {
      params.set('bedrooms', filters.bedrooms);
    }
    
    if (filters.bathrooms !== 'Any') {
      params.set('bathrooms', filters.bathrooms);
    }
    
    if (filters.propertyTypes.length > 0) {
      params.set('propertyTypes', filters.propertyTypes.join(','));
    }
    
    if (filters.amenities.length > 0) {
      params.set('amenities', filters.amenities.join(','));
    }
    
    if (filters.availableFrom) {
      params.set('availableFrom', filters.availableFrom.toISOString().split('T')[0]);
    }

    const queryString = params.toString();
    navigate(`/properties${queryString ? `?${queryString}` : ''}`);
  };

  // Check if any filters are active (for showing clear button, etc.)
  const hasActiveFilters = () => {
    return (
      filters.location.trim() !== '' ||
      (filters.minPrice && filters.minPrice !== '0') ||
      filters.maxPrice !== '' ||
      filters.bedrooms !== 'Any' ||
      filters.bathrooms !== 'Any' ||
      filters.propertyTypes.length > 0 ||
      filters.amenities.length > 0 ||
      filters.availableFrom !== null
    );
  };

  return {
    filters,
    updateFilters,
    clearFilters,
    executeSearch,
    hasActiveFilters: hasActiveFilters(),
  };
}
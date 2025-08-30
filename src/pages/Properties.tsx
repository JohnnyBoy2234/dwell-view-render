import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

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

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get search parameters from URL
  const searchTerm = searchParams.get('search') || searchParams.get('location') || '';
  const propertyType = searchParams.get('propertyType') || searchParams.get('type') || 'Any';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const bedrooms = searchParams.get('bedrooms') || 'Any';
  const bathrooms = searchParams.get('bathrooms') || 'Any';
  
  // Debug logging
  useEffect(() => {
    console.log('[Properties] URL Search Params:', {
      searchTerm,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms
    });
  }, [searchTerm, propertyType, minPrice, maxPrice, bedrooms, bathrooms]);
  
  // Filter properties based on search criteria
  const filteredProperties = properties.filter(property => {
    // Location search
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase().trim();
      const propertyLocationLower = property.location.toLowerCase();
      
      console.log('[Properties] Filtering property:', {
        propertyLocation: property.location,
        searchTerm: searchTerm,
        searchTermLower,
        propertyLocationLower
      });
      
      // Split search terms and location into words
      const searchWords = searchTermLower.split(/[\s,]+/).filter(word => word.length > 1);
      const locationWords = propertyLocationLower.split(/[\s,]+/).filter(word => word.length > 1);
      
      console.log('[Properties] Words comparison:', {
        searchWords,
        locationWords
      });
      
      // Check if ALL search words are present in the location
      const allSearchWordsFound = searchWords.every(searchWord => {
        const found = locationWords.some(locationWord => 
          locationWord.includes(searchWord) || searchWord.includes(locationWord)
        );
        console.log(`[Properties] Search word "${searchWord}" found: ${found}`);
        return found;
      });
      
      if (!allSearchWordsFound) {
        console.log('[Properties] Property filtered out - not all search words found');
        return false;
      }
      
      // Additional validation for short search terms
      const searchTermLength = searchTermLower.length;
      if (searchTermLength < 4) {
        const hasSignificantMatch = locationWords.some(locationWord => 
          locationWord.length >= searchTermLength + 2 && locationWord.includes(searchTermLower)
        );
        if (!hasSignificantMatch) {
          console.log('[Properties] Property filtered out - short search term validation failed');
          return false;
        }
      }
      
      // City validation
      const commonCities = ['cape town', 'johannesburg', 'pretoria', 'durban', 'port elizabeth', 'bloemfontein', 'kimberley', 'east london', 'nelspruit', 'polokwane'];
      const isSearchingForCity = commonCities.some(city => searchTermLower.includes(city));
      
      if (isSearchingForCity) {
        const cityInLocation = commonCities.some(city => propertyLocationLower.includes(city));
        if (!cityInLocation) {
          console.log('[Properties] Property filtered out - city validation failed');
          return false;
        }
      }
      
      console.log('[Properties] Property passed location filter');
    }

    // Property type filter
    if (propertyType !== 'Any' && property.property_type !== propertyType) {
      return false;
    }

    // Price range filter
    if (minPrice && property.price < parseInt(minPrice)) {
      return false;
    }
    if (maxPrice && property.price > parseInt(maxPrice)) {
      return false;
    }

    // Bedrooms filter
    if (bedrooms !== 'Any' && property.bedrooms !== parseInt(bedrooms)) {
      return false;
    }

    // Bathrooms filter
    if (bathrooms !== 'Any' && property.bathrooms !== parseInt(bathrooms)) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    console.log('[Properties] Component mounted, fetching properties...');
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      console.log('[Properties] Starting to fetch properties...');
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'available')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Properties] Supabase error:', error);
        throw error;
      }
      
      console.log('[Properties] Properties fetched successfully:', data?.length || 0, 'properties');
      setProperties(data || []);
    } catch (error: any) {
      console.error('[Properties] Error fetching properties:', error);
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Error loading properties",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    console.log('[Properties] Rendering loading state...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    console.log('[Properties] Rendering error state...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Error Loading Properties</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={fetchProperties}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleClearFilters = () => {
    // Navigate back to properties page without search parameters
    navigate('/properties');
  };

  console.log('[Properties] Rendering properties page with', filteredProperties.length, 'filtered properties');
  console.log('[Properties] Search term:', searchTerm);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/30 to-ocean-blue/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-ocean-blue/10 via-white to-success-green/10 border border-ocean-blue/20 shadow-soft">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent mb-2">Find Your Perfect Home</h1>
          <p className="text-lg text-muted-foreground">
            {searchTerm ? `Searching for properties in ${searchTerm}` : `Discover ${properties.length} available properties across South Africa`}
          </p>
        </div>

        {/* Active Filters Display */}
        {(searchTerm || propertyType !== "Any" || minPrice || maxPrice || bedrooms !== "Any" || bathrooms !== "Any") && (
          <div className="mb-6 p-4 bg-white/80 rounded-xl border border-ocean-blue/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-ocean-blue">Active Filters</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-ocean-blue hover:bg-ocean-blue/10"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All Filters
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Location: {searchTerm}
                </div>
              )}
              {propertyType !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Type: {propertyType}
                </div>
              )}
              {minPrice && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Min: R{parseInt(minPrice).toLocaleString()}
                </div>
              )}
              {maxPrice && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Max: R{parseInt(maxPrice).toLocaleString()}
                </div>
              )}
              {bedrooms !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  {bedrooms} Bedroom{bedrooms !== "1" ? "s" : ""}
                </div>
              )}
              {bathrooms !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  {bathrooms} Bathroom{bathrooms !== "1" ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {filteredProperties.length} properties found
            {searchTerm && ` in ${searchTerm}`}
          </p>
          {filteredProperties.length !== properties.length && (
            <Button 
              variant="outline" 
              onClick={handleClearFilters}
              className="text-ocean-blue border-ocean-blue/30 hover:bg-ocean-blue/10"
            >
              Show All Properties
            </Button>
          )}
        </div>

        {/* Property Grid - Enhanced Responsive */}
        <ResponsivePropertyGrid 
          properties={filteredProperties}
          loading={loading}
          onClearFilters={handleClearFilters}
          onShowAllProperties={() => navigate('/properties')}
        />
      </div>
    </div>
  );
}
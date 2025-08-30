import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate } from 'react-router-dom';
import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { usePropertySearchFilters, PropertySearchFilters } from "@/hooks/usePropertySearchFilters";

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Use the correct search filters hook
  const { filters, updateFilters, executeSearch, clearFilters } = usePropertySearchFilters();
  
  // Filter properties based on search criteria
  const filteredProperties = properties.filter(property => {
    // Location search
    if (filters.searchTerm) {
      const searchTermLower = filters.searchTerm.toLowerCase().trim();
      const propertyLocationLower = property.location.toLowerCase();
      
      // Split search terms and location into words
      const searchWords = searchTermLower.split(/[\s,]+/).filter(word => word.length > 1);
      const locationWords = propertyLocationLower.split(/[\s,]+/).filter(word => word.length > 1);
      
      // Check if ALL search words are present in the location
      const allSearchWordsFound = searchWords.every(searchWord => {
        return locationWords.some(locationWord => 
          locationWord.includes(searchWord) || searchWord.includes(locationWord)
        );
      });
      
      if (!allSearchWordsFound) {
        return false;
      }
      
      // Additional validation for short search terms
      const searchTermLength = searchTermLower.length;
      if (searchTermLength < 4) {
        const hasSignificantMatch = locationWords.some(locationWord => 
          locationWord.length >= searchTermLength + 2 && locationWord.includes(searchTermLower)
        );
        if (!hasSignificantMatch) {
          return false;
        }
      }
      
      // City validation
      const commonCities = ['cape town', 'johannesburg', 'pretoria', 'durban', 'port elizabeth', 'bloemfontein', 'kimberley', 'east london', 'nelspruit', 'polokwane'];
      const isSearchingForCity = commonCities.some(city => searchTermLower.includes(city));
      
      if (isSearchingForCity) {
        const cityInLocation = commonCities.some(city => propertyLocationLower.includes(city));
        if (!cityInLocation) {
          return false;
        }
      }
    }

    // Property type filter
    if (filters.propertyType !== 'Any' && property.property_type !== filters.propertyType) {
      return false;
    }

    // Price range filter
    if (filters.minPrice && property.price < parseInt(filters.minPrice)) {
      return false;
    }
    if (filters.maxPrice && property.price > parseInt(filters.maxPrice)) {
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

    // Property types filter
    if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(property.property_type)) {
      return false;
    }

    // Amenities filter
    if (filters.amenities.length > 0 && 
        !filters.amenities.every(amenity => property.amenities?.includes(amenity))) {
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

  const handleSearch = () => {
    executeSearch();
  };

  const handleClearFilters = () => {
    clearFilters();
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

  console.log('[Properties] Rendering properties page with', filteredProperties.length, 'filtered properties');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/30 to-ocean-blue/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-ocean-blue/10 via-white to-success-green/10 border border-ocean-blue/20 shadow-soft">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent mb-2">Find Your Perfect Home</h1>
          <p className="text-lg text-muted-foreground">
            Discover {properties.length} available properties across South Africa
          </p>
        </div>

        {/* Search Interface */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-6 shadow-2xl border border-white/30">
            <Property24SearchBar
              filters={filters}
              onFiltersChange={updateFilters}
              onSearch={handleSearch}
              onMoreFiltersOpen={() => {}}
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.searchTerm || filters.propertyType !== "Any" || filters.minPrice || filters.maxPrice || filters.bedrooms !== "Any" || filters.bathrooms !== "Any" || filters.propertyTypes.length > 0 || filters.amenities.length > 0) && (
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
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.searchTerm && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Location: {filters.searchTerm}
                </div>
              )}
              {filters.propertyType !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Type: {filters.propertyType}
                </div>
              )}
              {filters.minPrice && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Min: R{parseInt(filters.minPrice).toLocaleString()}
                </div>
              )}
              {filters.maxPrice && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Max: R{parseInt(filters.maxPrice).toLocaleString()}
                </div>
              )}
              {filters.bedrooms !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  {filters.bedrooms} Bedroom{filters.bedrooms !== "1" ? "s" : ""}
                </div>
              )}
              {filters.bathrooms !== "Any" && (
                <div className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  {filters.bathrooms} Bathroom{filters.bathrooms !== "1" ? "s" : ""}
                </div>
              )}
              {filters.propertyTypes.map((type, index) => (
                <div key={index} className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  Type: {type}
                </div>
              ))}
              {filters.amenities.map((amenity, index) => (
                <div key={index} className="px-3 py-1 bg-ocean-blue/10 text-ocean-blue rounded-full text-sm border border-ocean-blue/20">
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {filteredProperties.length} properties found
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
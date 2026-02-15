// @ts-nocheck
import { useState, useEffect } from 'react';
import { LoadingLogo } from '@/components/ui/LoadingLogo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  listing_type?: string;
}

const ITEMS_PER_PAGE = 30;

export default function Properties() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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
    // Only show rental listings (exclude sale listings)
    if (property.listing_type === 'sale') {
      return false;
    }

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
  }, [currentPage]);

  const fetchProperties = async () => {
    try {
      console.log('[Properties] Starting to fetch properties...');
      setLoading(true);
      setError(null);
      
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .eq('status', 'available')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[Properties] Supabase error:', error);
        throw error;
      }
      
      console.log('[Properties] Properties fetched successfully:', data?.length || 0, 'properties');
      setProperties(data || []);
      setTotalCount(count || 0);
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
        <LoadingLogo size="lg" />
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
    setCurrentPage(1);
    navigate('/properties');
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer hover:bg-ocean-blue/10"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => handlePageChange(1)}
            isActive={currentPage === 1}
            className="cursor-pointer hover:bg-ocean-blue/10"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(<PaginationEllipsis key="ellipsis-1" />);
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
              className="cursor-pointer hover:bg-ocean-blue/10"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(<PaginationEllipsis key="ellipsis-2" />);
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer hover:bg-ocean-blue/10"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  console.log('[Properties] Rendering properties page with', filteredProperties.length, 'filtered properties');
  console.log('[Properties] Search term:', searchTerm);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/30 to-ocean-blue/5">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8 p-6 rounded-2xl bg-ocean-blue/10 border border-ocean-blue/20 shadow-soft">
          <h1 className="text-4xl font-bold text-ocean-blue mb-2">Find Your Perfect Home</h1>
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
          isSale={false}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 mb-8 flex justify-center">
            <Pagination>
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-ocean-blue/10'}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-ocean-blue/10'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyCard from '@/components/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, Grid, List } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces?: number;
  property_type: string;
  images: string[];
  featured: boolean;
  created_at: string;
}

const ITEMS_PER_PAGE = 30;

export default function SalesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const search = searchParams.get('search') || '';
  const propertyType = searchParams.get('propertyType') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const bedrooms = searchParams.get('bedrooms') || 'Any';
  const bathrooms = searchParams.get('bathrooms') || 'Any';

  const fetchProperties = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .eq('status', 'available' as any)
        .eq('listing_type', 'sale' as any)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setProperties(data as any); 
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [currentPage]);

  const filteredProperties = properties.filter(property => {
    if (search) {
      const searchTermLower = search.toLowerCase().trim();
      if (!property.location.toLowerCase().includes(searchTermLower) &&
          !property.title.toLowerCase().includes(searchTermLower)) {
        return false;
      }
    }
    if (propertyType && property.property_type !== propertyType) return false;
    if (minPrice && property.price < parseInt(minPrice)) return false;
    if (maxPrice && property.price > parseInt(maxPrice)) return false;
    if (bedrooms !== 'Any' && property.bedrooms !== parseInt(bedrooms)) return false;
    if (bathrooms !== 'Any' && property.bathrooms !== parseInt(bathrooms)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Properties For Sale</h1>
          <p className="text-muted-foreground">
            {search ? `Searching for properties for sale in ${search}` : `Discover ${properties.length} properties for sale across South Africa`}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80 flex-shrink-0">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search location..."
                      value={search}
                      onChange={(e) => {
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value) {
                          newParams.set('search', e.target.value);
                        } else {
                          newParams.delete('search');
                        }
                        setSearchParams(newParams);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Property Type</label>
                  <Select value={propertyType} onValueChange={(value) => {
                    const newParams = new URLSearchParams(searchParams);
                    if (value) {
                      newParams.set('propertyType', value);
                    } else {
                      newParams.delete('propertyType');
                    }
                    setSearchParams(newParams);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="apartment">Apartment</SelectItem>
                      <SelectItem value="house">House</SelectItem>
                      <SelectItem value="townhouse">Townhouse</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Min Price</label>
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => {
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value) {
                          newParams.set('minPrice', e.target.value);
                        } else {
                          newParams.delete('minPrice');
                        }
                        setSearchParams(newParams);
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Price</label>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => {
                        const newParams = new URLSearchParams(searchParams);
                        if (e.target.value) {
                          newParams.set('maxPrice', e.target.value);
                        } else {
                          newParams.delete('maxPrice');
                        }
                        setSearchParams(newParams);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Bedrooms</label>
                    <Select value={bedrooms} onValueChange={(value) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (value !== 'Any') {
                        newParams.set('bedrooms', value);
                      } else {
                        newParams.delete('bedrooms');
                      }
                      setSearchParams(newParams);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Bathrooms</label>
                    <Select value={bathrooms} onValueChange={(value) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (value !== 'Any') {
                        newParams.set('bathrooms', value);
                      } else {
                        newParams.delete('bathrooms');
                      }
                      setSearchParams(newParams);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Properties Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-muted-foreground">
                {filteredProperties.length} properties found
              </p>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading properties...</p>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No properties found matching your criteria</p>
                <Button className="mt-4" onClick={() => setSearchParams(new URLSearchParams())}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    id={property.id}
                    title={property.title}
                    location={property.location}
                    price={property.price}
                    beds={property.bedrooms}
                    baths={property.bathrooms}
                    parking={property.parking_spaces || 0}
                    image={property.images?.[0] || '/placeholder-house.jpg'}
                    type={property.property_type}
                    featured={property.featured}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

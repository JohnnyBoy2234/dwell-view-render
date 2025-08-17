import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Filter, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PropertyCard from '@/components/PropertyCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePropertySearch } from '@/hooks/usePropertySearch';

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

const propertyTypes = ['All', 'Apartment', 'House', 'Townhouse', 'Flat', 'Studio', 'Bachelor', 'Room'];
const amenitiesList = [
  'Swimming Pool', 'Garden', 'Security', 'Gym/Fitness Center', 
  'Braai Area', 'Air Conditioning', 'WiFi', 'DSTV', 
  'Backup Power', 'Water Tank', 'Fiber Internet', 'Pet Friendly'
];

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { toast } = useToast();
  
  const { filters, filteredProperties, updateFilters, clearFilters } = usePropertySearch(properties);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'available')
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading properties",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = filters.selectedAmenities.includes(amenity)
      ? filters.selectedAmenities.filter(a => a !== amenity)
      : [...filters.selectedAmenities, amenity];
    
    updateFilters({ selectedAmenities: newAmenities });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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

        {/* Search Bar */}
        <Card className="mb-6 shadow-medium border-ocean-blue/20 bg-gradient-to-r from-white to-earth-light/30">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by location or property name..."
                  value={filters.searchTerm}
                  onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
              <Select value={filters.propertyType} onValueChange={(value) => updateFilters({ propertyType: value })}>
                <SelectTrigger className="lg:w-48">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="lg:w-32"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <CollapsibleContent>
            <Card className="mb-6 shadow-medium border-success-green/20 bg-gradient-to-br from-white to-success-green-light/40">
              <CardHeader>
                <CardTitle>Advanced Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div className="space-y-3">
                  <Label>Price Range: R{filters.priceRange[0].toLocaleString()} - R{filters.priceRange[1].toLocaleString()}</Label>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Select value={filters.bedrooms} onValueChange={(value) => updateFilters({ bedrooms: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Any', '1', '2', '3', '4', '5+'].map(num => (
                          <SelectItem key={num} value={num}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Select value={filters.bathrooms} onValueChange={(value) => updateFilters({ bathrooms: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Any', '1', '2', '3', '4+'].map(num => (
                          <SelectItem key={num} value={num}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional Options */}
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="furnished"
                      checked={filters.furnished}
                      onCheckedChange={(checked) => updateFilters({ furnished: !!checked })}
                    />
                    <Label htmlFor="furnished">Furnished Only</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pets"
                      checked={filters.petsAllowed}
                      onCheckedChange={(checked) => updateFilters({ petsAllowed: !!checked })}
                    />
                    <Label htmlFor="pets">Pet Friendly</Label>
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-3">
                  <Label>Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {amenitiesList.map(amenity => (
                      <Badge
                        key={amenity}
                        variant={filters.selectedAmenities.includes(amenity) ? "default" : "outline"}
                        className="cursor-pointer justify-center p-2 text-xs"
                        onClick={() => toggleAmenity(amenity)}
                      >
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        {/* Results */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-muted-foreground">
            {filteredProperties.length} properties found
          </p>
          {(filters.searchTerm || filters.propertyType !== 'All' || filters.selectedAmenities.length > 0 || filters.furnished || filters.petsAllowed) && (
            <Button
              variant="outline"
              onClick={clearFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Property Grid - Mobile responsive */}
        {filteredProperties.length === 0 ? (
          <Card className="p-8 lg:p-12 text-center">
            <Home className="h-12 w-12 lg:h-16 lg:w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg lg:text-xl font-semibold mb-2">No properties found</h3>
            <p className="text-sm lg:text-base text-muted-foreground mb-4">
              Try adjusting your search criteria or browse all available properties.
            </p>
            <Button onClick={clearFilters} size="sm">
              Show All Properties
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                id={property.id}
                title={property.title}
                location={property.location}
                price={property.price}
                beds={property.bedrooms}
                baths={property.bathrooms}
                parking={property.parking_spaces}
                image={property.images?.[0] || `https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=500&h=300&fit=crop`}
                type={property.property_type}
                featured={property.featured}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
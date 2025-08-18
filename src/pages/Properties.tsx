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
import { EnhancedAddressAutocomplete } from '@/components/ui/enhanced-address-autocomplete';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PropertyCard from '@/components/PropertyCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePropertySearch } from '@/hooks/usePropertySearch';
import { NoResultsMessage } from '@/components/search/NoResultsMessage';
import { ResponsivePropertyGrid } from '@/components/ResponsivePropertyGrid';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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

        {/* Enhanced Search Bar with Google Places Autocomplete */}
        <Card className="mb-6 shadow-medium border-ocean-blue/20 bg-gradient-to-r from-white to-earth-light/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              {/* Location Search with Google Places Autocomplete */}
              <div className="flex-1">
                <EnhancedAddressAutocomplete
                  value={filters.searchTerm}
                  onChange={(value) => updateFilters({ searchTerm: value })}
                  placeholder="Search by location (city, suburb, street)..."
                  className="h-12 text-base border-ocean-blue/30 focus:border-ocean-blue focus:ring-ocean-blue bg-white text-foreground"
                />
              </div>
              
              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filters.propertyType} onValueChange={(value) => updateFilters({ propertyType: value })}>
                  <SelectTrigger className="flex-1 sm:max-w-48 h-12 border-ocean-blue/30 focus:border-ocean-blue focus:ring-ocean-blue">
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border z-50">
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type} className="hover:bg-accent">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="h-12 px-6 border-ocean-blue/30 text-ocean-blue hover:bg-ocean-blue hover:text-white transition-colors"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {filtersOpen ? 'Hide Filters' : 'More Filters'}
                </Button>
                
                {/* Clear Filters Button */}
                {(filters.searchTerm || filters.propertyType !== 'All' || filters.selectedAmenities.length > 0) && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="h-12 px-6 text-muted-foreground hover:text-foreground"
                  >
                    Clear All
                  </Button>
                )}
              </div>
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
                  <Label>Price Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                      <select
                        value={filters.priceRange[0] === 0 ? "" : filters.priceRange[0].toString()}
                        onChange={(e) => {
                          const newMin = e.target.value ? parseInt(e.target.value) : 0;
                          const currentMax = filters.priceRange[1];
                          if (newMin > currentMax) {
                            updateFilters({ priceRange: [newMin, newMin] as [number, number] });
                          } else {
                            updateFilters({ priceRange: [newMin, currentMax] as [number, number] });
                          }
                        }}
                        className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
                      >
                        <option value="">Any</option>
                        <option value="5000">R5,000</option>
                        <option value="10000">R10,000</option>
                        <option value="15000">R15,000</option>
                        <option value="20000">R20,000</option>
                        <option value="25000">R25,000</option>
                        <option value="30000">R30,000</option>
                        <option value="35000">R35,000</option>
                        <option value="40000">R40,000</option>
                        <option value="50000">R50,000</option>
                        <option value="60000">R60,000</option>
                        <option value="70000">R70,000</option>
                        <option value="80000">R80,000</option>
                        <option value="90000">R90,000</option>
                        <option value="100000">R100,000+</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                      <select
                        value={filters.priceRange[1] === 100000 ? "" : filters.priceRange[1].toString()}
                        onChange={(e) => {
                          const newMax = e.target.value ? parseInt(e.target.value) : 100000;
                          const currentMin = filters.priceRange[0];
                          if (newMax < currentMin) {
                            updateFilters({ priceRange: [newMax, newMax] as [number, number] });
                          } else {
                            updateFilters({ priceRange: [currentMin, newMax] as [number, number] });
                          }
                        }}
                        className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background"
                      >
                        <option value="">Any</option>
                        <option value="5000">R5,000</option>
                        <option value="10000">R10,000</option>
                        <option value="15000">R15,000</option>
                        <option value="20000">R20,000</option>
                        <option value="25000">R25,000</option>
                        <option value="30000">R30,000</option>
                        <option value="35000">R35,000</option>
                        <option value="40000">R40,000</option>
                        <option value="50000">R50,000</option>
                        <option value="60000">R60,000</option>
                        <option value="70000">R70,000</option>
                        <option value="80000">R80,000</option>
                        <option value="90000">R90,000</option>
                        <option value="100000">R100,000+</option>
                      </select>
                    </div>
                  </div>
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

        {/* Property Grid - Enhanced Responsive */}
        <ResponsivePropertyGrid 
          properties={filteredProperties}
          loading={loading}
          onClearFilters={clearFilters}
          onShowAllProperties={() => navigate('/properties')}
        />
      </div>
    </div>
  );
}
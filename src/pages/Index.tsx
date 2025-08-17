import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import PropertyCard from "@/components/PropertyCard";
import { PropertySearchBar } from "@/components/search/PropertySearchBar";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { Search, Home, Shield, Users, Star, ArrowRight, CheckCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

const Index = () => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [userType, setUserType] = useState('tenant'); // 'tenant' or 'landlord'
  const navigate = useNavigate();

  // Unified filters object used by PropertySearchBar and the rest of the page
  const [filters, setFilters] = useState({
    location: "",
    propertyType: "Any",
    minPrice: "",
    maxPrice: "",
    bedrooms: "Any",
  });

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    propertyTypes: [] as string[],
    amenities: [] as string[],
    bathrooms: "Any" as string,
    availableFrom: null as Date | null,
  });

  const isTenant = userType === 'tenant';

  // merge partial updates coming from PropertySearchBar
  const onFiltersChange = (patch: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  };

  // build query and navigate to /properties so the Properties page can read filters from the URL
  const applyFilters = () => {
    const params = new URLSearchParams();

    // include location if set (trimmed)
    const loc = filters.location?.trim();
    if (loc) params.set("location", loc);

    if (filters.propertyType && filters.propertyType !== "Any") params.set("propertyType", filters.propertyType);
    if (filters.minPrice && filters.minPrice !== "") params.set("minPrice", filters.minPrice);
    if (filters.maxPrice && filters.maxPrice !== "") params.set("maxPrice", filters.maxPrice);
    if (filters.bedrooms && filters.bedrooms !== "Any") params.set("bedrooms", filters.bedrooms);

    const query = params.toString();
    console.debug("navigate /properties with query:", query, "filters:", filters);
    navigate(`/properties${query ? `?${query}` : ""}`);
  };

  const handleSearch = () => {
    // ensure latest filters (including location) are used
    applyFilters();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  // Featured properties for the homepage
  const featuredProperties = [
    {
      id: "1",
      title: "Modern 2-Bedroom Apartment in Sandton",
      location: "Sandton, Johannesburg",
      price: 15000,
      beds: 2,
      baths: 2,
      parking: 1,
      image: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "Apartment" as const,
      featured: true,
    },
    {
      id: "2",
      title: "Spacious Family House with Garden",
      location: "Rosebank, Cape Town",
      price: 22000,
      beds: 4,
      baths: 3,
      parking: 2,
      image: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "House" as const,
    },
    {
      id: "3",
      title: "Luxury Townhouse Near Waterfront",
      location: "V&A Waterfront, Cape Town",
      price: 35000,
      beds: 3,
      baths: 2,
      parking: 2,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      type: "Townhouse" as const,
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/90 via-ocean-blue-dark/85 to-success-green/80"></div>
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-[70vh] sm:min-h-[80vh] lg:min-h-screen flex items-center">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 mt-2 sm:mt-4 lg:mt-0 block text-white leading-tight">
              <span className="block text-white">Renting the way</span>
              <span className="block text-success-green">it should be</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90">
              Find your perfect rental home in South Africa — connecting landlords and tenants directly with state-of-the-art technology. No agents. Zero commission. Full control.
            </p>
            
            {/* Property24-style Search Bar */}
            <PropertySearchBar
              filters={filters}
              onFiltersChange={onFiltersChange}
              onMoreFiltersClick={() => setMoreFiltersOpen(true)}
              onSearch={handleSearch}
            />

            <MoreFiltersModal
              open={moreFiltersOpen}
              onClose={() => setMoreFiltersOpen(false)}
              filters={advancedFilters}
              onFiltersChange={(newFilters) => {
                setAdvancedFilters(prev => ({ ...prev, ...newFilters }));
              }}
              onApplyFilters={applyFilters}
              onClearFilters={() => {
                setAdvancedFilters({
                  propertyTypes: [],
                  amenities: [],
                  bathrooms: "Any",
                  availableFrom: null
                });
                setFilters({
                  location: "",
                  propertyType: "Any",
                  minPrice: "",
                  maxPrice: "",
                  bedrooms: "Any",
                });
              }}
            />
            
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/90">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Direct Contact</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>No Commission</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Verified Properties</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-4">How SwiftRent Works</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Simple steps to find your home or rent your property
            </p>
            
            {/* Toggle Switch - visible on mobile */}
            <div className="flex items-center justify-center space-x-4 mb-8 lg:hidden">
              <Label htmlFor="user-type-toggle" className={`font-medium transition-colors ${isTenant ? 'text-primary' : 'text-muted-foreground'}`}>
                For Tenants
              </Label>
              <Switch
                id="user-type-toggle"
                checked={!isTenant}
                onCheckedChange={(checked) => setUserType(checked ? 'landlord' : 'tenant')}
                aria-label="Toggle between tenant and landlord view"
              />
              <Label htmlFor="user-type-toggle" className={`font-medium transition-colors ${!isTenant ? 'text-primary' : 'text-muted-foreground'}`}>
                For Landlords
              </Label>
            </div>
          </div>
          
          {/* Desktop - show both cards side by side */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* For Tenants */}
            <Card className="shadow-lg border-ocean-blue/20 bg-gradient-to-br from-white to-ocean-blue/5 min-h-[420px] flex flex-col">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft bg-gradient-to-br from-ocean-blue to-ocean-blue-light">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-ocean-blue-dark">For Tenants</h3>
                    <p className="text-sm text-muted-foreground">Find your perfect home</p>
                  </div>
                </div>
                
                <div className="space-y-6 flex-grow">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-ocean-blue-light rounded-full flex items-center justify-center flex-shrink-0">
                      <Search className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Search & Find</h4>
                      <p className="text-sm text-muted-foreground">Browse thousands of verified properties with photos and details</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-earth-warm to-earth-warm-dark rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Connect & View</h4>
                      <p className="text-sm text-muted-foreground">Message landlords directly and book property viewings</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-success-green to-success-green-glow rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Apply & Move In</h4>
                      <p className="text-sm text-muted-foreground">Submit your application online and sign your lease digitally</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <Link to="/properties">
                    <Button className="w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white">
                      Start Searching
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* For Landlords */}
            <Card className="shadow-lg border-success-green/20 bg-gradient-to-br from-white to-success-green/5 min-h-[420px] flex flex-col">
              <CardContent className="p-8 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft bg-gradient-to-br from-success-green to-success-green-glow">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-success-green-dark">For Landlords</h3>
                    <p className="text-sm text-muted-foreground">List your property easily</p>
                  </div>
                </div>
                
                <div className="space-y-6 flex-grow">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-success-green to-success-green-glow rounded-full flex items-center justify-center flex-shrink-0">
                      <Home className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">List Your Property</h4>
                      <p className="text-sm text-muted-foreground">Add property details, upload photos, and set your price</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-earth-warm to-earth-warm-dark rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Meet Tenants</h4>
                      <p className="text-sm text-muted-foreground">Receive applications and choose your ideal tenant</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-ocean-blue-light rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Rent & Manage</h4>
                      <p className="text-sm text-muted-foreground">Sign lease agreements and collect rent payments online</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <Link to="/list-property">
                    <Button className="w-full bg-success-green hover:bg-success-green-dark text-white">
                      List Property
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile - show single card based on toggle */}
          <div className="lg:hidden max-w-md mx-auto">
            {isTenant ? (
              <Card key="tenant" className="shadow-lg border-ocean-blue/20 bg-gradient-to-br from-white to-ocean-blue/5 transition-all duration-500">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft bg-gradient-to-br from-ocean-blue to-ocean-blue-light">
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-ocean-blue-dark">For Tenants</h3>
                      <p className="text-sm text-muted-foreground">Find your perfect home</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-ocean-blue-light rounded-full flex items-center justify-center flex-shrink-0">
                        <Search className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Search & Find</h4>
                        <p className="text-sm text-muted-foreground">Browse thousands of verified properties with photos and details</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-earth-warm to-earth-warm-dark rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Connect & View</h4>
                        <p className="text-sm text-muted-foreground">Message landlords directly and book property viewings</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-success-green to-success-green-glow rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Apply & Move In</h4>
                        <p className="text-sm text-muted-foreground">Submit your application online and sign your lease digitally</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <Link to="/properties">
                      <Button className="w-full bg-ocean-blue hover:bg-ocean-blue-dark text-white">
                        Start Searching
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card key="landlord" className="shadow-lg border-success-green/20 bg-gradient-to-br from-white to-success-green/5 transition-all duration-500">
                <CardContent className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft bg-gradient-to-br from-success-green to-success-green-glow">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-success-green-dark">For Landlords</h3>
                      <p className="text-sm text-muted-foreground">List your property easily</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-success-green to-success-green-glow rounded-full flex items-center justify-center flex-shrink-0">
                        <Home className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">List Your Property</h4>
                        <p className="text-sm text-muted-foreground">Add property details, upload photos, and set your price</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-earth-warm to-earth-warm-dark rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Meet Tenants</h4>
                        <p className="text-sm text-muted-foreground">Receive applications and choose your ideal tenant</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-ocean-blue-light rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">Rent & Manage</h4>
                        <p className="text-sm text-muted-foreground">Sign lease agreements and collect rent payments online</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <Link to="/list-property">
                      <Button className="w-full bg-success-green hover:bg-success-green-dark text-white">
                        List Property
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Featured Properties</h2>
            <p className="text-lg text-muted-foreground">
              Discover handpicked properties across South Africa's major cities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} {...property} />
            ))}
          </div>
          
          <div className="text-center">
            <Link to="/properties">
              <Button size="lg" variant="outline">
                View All Properties
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">5,000+</div>
              <div className="text-muted-foreground">Active Properties</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">15,000+</div>
              <div className="text-muted-foreground">Happy Tenants</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Home?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of satisfied customers who found their perfect rental through SwiftRent
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/properties">
              <Button size="lg" variant="secondary">
                Browse Properties
              </Button>
            </Link>
            <Link to="/list-property">
              <Button size="lg" variant="outline" className="text-white border-white/80 hover:bg-white hover:text-ocean-blue backdrop-blur-sm bg-white/10">
                List Your Property
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-ocean-blue to-success-green rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">SwiftRent</span>
              </div>
              <p className="text-muted-foreground">
                Connecting landlords and tenants directly across South Africa.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Tenants</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/properties" className="hover:text-primary">Browse Properties</Link></li>
                <li><Link to="/how-it-works" className="hover:text-primary">How It Works</Link></li>
                <li><a href="#" className="hover:text-primary">Rental Tips</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Landlords</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary">List Property</a></li>
                <li><a href="#" className="hover:text-primary">Pricing Guide</a></li>
                <li><a href="#" className="hover:text-primary">Landlord Resources</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary">About Us</Link></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SwiftRent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

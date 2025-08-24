import { Button } from "@/components/ui/button";

import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";

import PropertyCard from "@/components/PropertyCard";
import { BenefitsSlider } from "@/components/BenefitsSlider";

import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";

import { ArrowRight, CheckCircle } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useState } from "react";
import HowItWorks from "@/components/HowItWorks";

const Index = () => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const navigate = useNavigate();

  // Use the unified search filters hook
  const { filters, updateFilters, executeSearch } = usePropertySearchFilters();

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState({
    propertyTypes: [] as string[],
    amenities: [] as string[],
    bathrooms: "Any" as string,
    availableFrom: null as Date | null,
  });

  // No results state for hero section
  const [showNoResults, setShowNoResults] = useState(false);

  // merge partial updates coming from Property24SearchBar
  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
    setShowNoResults(false); // Clear no results when filters change
  };

  // Execute search using the hook
  const applyFilters = () => {
    executeSearch();
  };

  const handleSearch = () => {
    // Clear any previous no results state
    setShowNoResults(false);
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-[70vh] sm:min-h-[80vh] lg:min-h-screen flex items-center justify-center">
          <div className="text-center max-w-4xl mx-auto w-full">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 mt-2 sm:mt-4 lg:mt-0 block text-white leading-tight">
              <span className="block text-white">Renting the way</span>
              <span className="block text-success-green">it should be</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90">
              Find your perfect rental home in South Africa — connecting landlords and tenants directly with state-of-the-art technology. No agents. Zero commission. Full control.
            </p>
            
            {/* Property24-style Search Bar */}
            <Property24SearchBar
              filters={filters}
              onFiltersChange={onFiltersChange}
              onSearch={handleSearch}
              onMoreFiltersOpen={() => setMoreFiltersOpen(true)}
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
                updateFilters({
                  searchTerm: "",
                  propertyType: "Any",
                  minPrice: "",
                  maxPrice: "",
                  bedrooms: "Any",
                  bathrooms: "Any",
                  propertyTypes: [],
                  amenities: [],
                  availableFrom: null
                });
              }}
            />
            
            {/* No Results Message in Hero Section */}
            {showNoResults && (
              <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">No properties match your filters</h3>
                  <p className="text-white/80 mb-4">Try adjusting your search criteria or browse all available properties.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button 
                      variant="outline"  
                      onClick={() => {
                        updateFilters({
                          searchTerm: "",
                          propertyType: "Any",
                          minPrice: "",
                          maxPrice: "",
                          bedrooms: "Any",
                          bathrooms: "Any",
                          propertyTypes: [],
                          amenities: [],
                          availableFrom: null
                        });
                        setAdvancedFilters({
                          propertyTypes: [],
                          amenities: [],
                          bathrooms: "Any",
                          availableFrom: null
                        });
                        setShowNoResults(false);
                      }}
                      className="border-white/30 text-white hover:bg-white hover:text-ocean-blue"
                    >
                      Clear Filters
                    </Button>
                    <Button 
                      onClick={() => navigate('/properties')}
                      className="bg-white text-ocean-blue hover:bg-white/90"
                    >
                      Browse All Properties
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
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
      <HowItWorks />

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

      <BenefitsSlider />

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

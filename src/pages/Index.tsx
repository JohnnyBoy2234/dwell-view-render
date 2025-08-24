import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Input,
} from "@/components/ui/input";

import {
  EnhancedAddressAutocomplete,
} from "@/components/ui/enhanced-address-autocomplete";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Switch,
} from "@/components/ui/switch";

import {
  Label,
} from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Slider,
} from "@/components/ui/slider";

import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";

import PropertyCard from "@/components/PropertyCard";
import { BenefitsSlider } from "@/components/BenefitsSlider";

import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";

import {
  Search,
  Home,
  Shield,
  Users,
  Star,
  ArrowRight,
  CheckCircle,
  MessageSquare,
  Calendar,
  FileText,
  DollarSign,
  Mail,
  Building2,
} from "lucide-react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

const tenantData = {
  header: {
    icon: <Home className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Tenants",
    subtitle: "Find Your Home",
    description: "Discover your perfect rental home with complete transparency and direct landlord contact."
  },
  steps: [
    { icon: <Search className="h-4 w-4 text-white" />, title: "Search & Discover", description: "Browse thousands of verified properties with detailed photos, descriptions, and transparent pricing.", badges: ["Advanced Filters", "Interactive Maps", "Verified Listings"] },
    { icon: <MessageSquare className="h-4 w-4 text-white" />, title: "Connect Directly", description: "Message landlords directly, book viewings, and ask questions without any intermediaries.", badges: ["Direct Messaging", "Quick Responses", "No Agents"] },
    { icon: <Calendar className="h-4 w-4 text-white" />, title: "Schedule Viewings", description: "Book convenient viewing times and get instant confirmations from landlords.", badges: ["Online Booking", "Flexible Times", "Instant Confirmation"] },
    { icon: <FileText className="h-4 w-4 text-white" />, title: "Apply & Sign", description: "Submit applications online and sign lease agreements digitally for a seamless process.", badges: ["Digital Applications", "E-Signatures", "Fast Processing"] }
  ],
  cta: {
    text: "Start Your Search",
    link: "/properties"
  }
};

const landlordData = {
  header: {
    icon: <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />,
    title: "For Landlords",
    subtitle: "List Your Property",
    description: "List your property and connect with quality tenants without paying agent commissions."
  },
  steps: [
    { icon: <Building2 className="h-4 w-4 text-white" />, title: "List Your Property", description: "Create a professional listing in minutes with photos, details, and your rental price.", badges: ["Easy Setup", "Photo Upload", "Rich Descriptions"] },
    { icon: <Mail className="h-4 w-4 text-white" />, title: "Book Viewings", description: "Chat directly with tenants and schedule viewings at times that suit you.", badges: ["Direct Contact", "Scheduling", "No Agents"] },
    { icon: <Shield className="h-4 w-4 text-white" />, title: "Recieve Applications", description: "Get organized applications online, review instantly, and screen tenants with confidence.", badges: ["Easy Applications", "Screening", "Fast Processing"] },
    { icon: <DollarSign className="h-4 w-4 text-white" />, title: "Manage & Collect", description: "Collect rent online with secure payments and track everything in one place.", badges: ["Online Payments", "Maintenance Tracking", "Financial Reports"] }
  ],
  cta: {
    text: "List Your Property",
    link: "/list-property"
  }
};

const Index = () => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [userType, setUserType] = useState('tenant'); // 'tenant' or 'landlord'
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

  const isTenant = userType === 'tenant';

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

  const activeData = isTenant ? tenantData : landlordData;

  // Define icon colors based on user type
  const iconColors = {
    tenant: ['from-ocean-blue to-ocean-blue-light', 'from-earth-warm to-earth-warm-dark', 'from-success-green to-success-green-glow', 'from-purple-500 to-purple-600'],
    landlord: ['from-success-green to-success-green-glow', 'from-earth-warm to-earth-warm-dark', 'from-ocean-blue to-ocean-blue-light', 'from-purple-500 to-purple-600']
  };

  const renderHowItWorksCard = (data: typeof tenantData, tenantView: boolean) => {
    const colors = tenantView ? iconColors.tenant : iconColors.landlord;
    return (
      <Card className={`shadow-strong overflow-hidden transition-all duration-500 animate-fade-in ${tenantView ? 'border-ocean-blue/20 bg-gradient-to-br from-white via-white to-ocean-blue/5' : 'border-success-green/20 bg-gradient-to-br from-white via-white to-success-green/5'}`}>
        <CardHeader className={`pb-6 ${tenantView ? 'bg-gradient-to-r from-ocean-blue/10 to-ocean-blue/5' : 'bg-gradient-to-r from-success-green/10 to-success-green/5'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-soft ${tenantView ? 'bg-gradient-to-br from-ocean-blue to-ocean-blue-light' : 'bg-gradient-to-br from-success-green to-success-green-glow'}`}>
              {data.header.icon}
            </div>
            <div>
              <CardTitle className={`text-xl sm:text-2xl ${tenantView ? 'text-ocean-blue-dark' : 'text-success-green-dark'}`}>{data.header.title}</CardTitle>
              <Badge variant="outline" className="mt-1 text-xs">{data.header.subtitle}</Badge>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            {data.header.description}
          </p>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {data.steps.map((step, index) => (
            <div className="flex gap-4" key={index}>
              <div className={`w-8 h-8 bg-gradient-to-br ${colors[index]} rounded-full flex items-center justify-center flex-shrink-0 shadow-soft`}>
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg sm:text-xl mb-3">{step.title}</h3>
                <p className="text-base sm:text-lg text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                <div className="flex flex-wrap gap-2">
                  {step.badges.map((badge, i) => (
                    <Badge variant="secondary" className="text-sm" key={i}>{badge}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t">
            <Link to={data.cta.link}>
              <Button className={`w-full text-white shadow-soft ${tenantView ? 'bg-ocean-blue hover:bg-ocean-blue-dark' : 'bg-success-green hover:bg-success-green-dark'}`}>
                {data.cta.text}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  };

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

      {/* Benefits Slider Section */}
      <BenefitsSlider />

      {/* How It Works Section */}
    <div className="min-h-screen bg-gradient-to-br from-background via-earth-light/20 to-ocean-blue/5">
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-ocean-blue to-success-green bg-clip-text text-transparent">
              How SwiftRent Works
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground mb-10 sm:mb-16 leading-relaxed">
              Connecting landlords and tenants directly with no agents, zero commission, and full control
            </p>
          </div>
        </div>
      </section>

      {/* Toggle Switch Section - mobile only */}
      <section className="pb-12 md:hidden">
        <div className="flex items-center justify-center space-x-4">
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
      </section>

      {/* Main Content */}
      <section className="pb-8 sm:pb-12 lg:pb-16">
        <div className="max-w-3xl md:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Mobile view - single card */}
            <div className="md:hidden">
              {renderHowItWorksCard(activeData, isTenant)}
            </div>

            {/* Desktop view - two cards side by side */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-8">
              {renderHowItWorksCard(tenantData, true)}
              {renderHowItWorksCard(landlordData, false)}
            </div>
          </div>
        </div>
      </section>
      </div>

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

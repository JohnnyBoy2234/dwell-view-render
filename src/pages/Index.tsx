import { Button } from "@/components/ui/button";
import "@/styles/animations.css";
import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";
import PropertyCard from "@/components/PropertyCard";
import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";
import { ArrowRight, CheckCircle, Home, Star, Zap, Shield, Users, Calendar, FileText, Wrench, Building, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import HowItWorks from "@/components/HowItWorks";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuth } from "@/hooks/useAuth";
import heroBackground from "@/assets/hero-background-new.jpg";

// Animated counter component
function AnimatedCounter({ from = 0, to, duration = 1200 }: { from?: number; to: number; duration?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [val, setVal] = useState(from);
  useEffect(() => {
    let raf = 0;
    let start = 0;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(from + (to - from) * eased));
          if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        obs.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [from, to, duration]);
  return <div ref={ref}>{val.toLocaleString()}</div>;
}

const Index = () => {
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isLandlord } = useAuth();

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
    setShowNoResults(false);
  };

  // Execute search using the hook
  const applyFilters = () => {
    executeSearch();
  };

  const handleSearch = () => {
    setShowNoResults(false);
    applyFilters();
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
    <div className="min-h-screen">
      {/* Hero Section with Background Image */}
      <section 
        className="relative h-screen flex items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBackground})` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/80 via-ocean-blue-dark/75 to-success-green/70" />
        
        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="block">Find Your Perfect</span>
              <span className="block text-success-green">Rental Home</span>
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-light text-white/90 max-w-4xl mx-auto">
              Connect directly with landlords. No agents. No commission. 
              <span className="block mt-2">Just seamless renting in South Africa.</span>
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-4xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="backdrop-blur-xl bg-white/15 border border-white/30 rounded-3xl p-6 shadow-2xl">
              <Property24SearchBar
                filters={filters}
                onFiltersChange={onFiltersChange}
                onSearch={handleSearch}
                onMoreFiltersOpen={() => setMoreFiltersOpen(true)}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '400ms' }}>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-success-green mb-1">1000+</div>
              <div className="text-sm sm:text-base text-white/80">Properties</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-success-green mb-1">0%</div>
              <div className="text-sm sm:text-base text-white/80">Commission</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-bold text-success-green mb-1">24/7</div>
              <div className="text-sm sm:text-base text-white/80">Support</div>
            </div>
          </div>

          {/* Admin Quick Access */}
          {user && isAdmin && (
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
              <Button 
                onClick={() => navigate('/admin/dashboard')}
                variant="outline"
                className="border-white/30 text-white hover:bg-white hover:text-ocean-blue backdrop-blur-sm"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Panel
              </Button>
            </div>
          )}
        </div>

        {/* More Filters Modal */}
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
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-background to-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose SwiftRent?
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From listing to lease signing, we've got you covered with cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Smart Applications",
                description: "Online applications with credit checks and automated screening powered by Experian."
              },
              {
                icon: Calendar,
                title: "Easy Scheduling",
                description: "Integrated calendar system for seamless property viewings and appointments."
              },
              {
                icon: FileText,
                title: "Digital Contracts",
                description: "Sign lease agreements online with full legal compliance and document management."
              },
              {
                icon: Wrench,
                title: "Maintenance Hub",
                description: "Track maintenance requests from submission to completion with full transparency."
              },
              {
                icon: Building,
                title: "Portfolio Management",
                description: "Manage your entire property portfolio from one powerful dashboard."
              },
              {
                icon: Bell,
                title: "Smart Notifications",
                description: "Real-time alerts via email, WhatsApp, and in-app messaging for everything important."
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-card/80 backdrop-blur-sm p-8 rounded-3xl border border-border/50 hover:shadow-ios-lg transition-all duration-300 hover:-translate-y-2"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center mb-4">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Simple steps to find your perfect rental
            </p>
          </div>
          <HowItWorks />
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20 bg-gradient-to-br from-secondary/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Featured Properties
            </h2>
            <p className="text-xl text-muted-foreground">
              Discover amazing rental opportunities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} {...property} />
            ))}
          </div>

          <div className="text-center">
            <Button 
              onClick={() => navigate('/properties')}
              size="lg"
              className="bg-ocean-blue hover:bg-ocean-blue-dark text-white px-8 py-4 text-lg rounded-2xl"
            >
              View All Properties
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Success Stats */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-muted-foreground">
              Join the fastest-growing rental platform in South Africa
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: <AnimatedCounter to={1200} />, suffix: '+', label: "Properties Listed" },
              { number: <AnimatedCounter to={850} />, suffix: '+', label: "Happy Tenants" },
              { number: "0", suffix: '%', label: "Commission Fee" },
              { number: "24/7", suffix: '', label: "Support Available" }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-5xl font-bold text-ocean-blue mb-2">
                  {stat.number}{stat.suffix}
                </div>
                <div className="text-muted-foreground text-sm sm:text-base">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 bg-gradient-to-r from-ocean-blue/5 to-success-green/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12">
            {[
              'No Agent Commission',
              'Secure Payments',
              'Instant Messaging',
              'Maintenance Manager',
              'Digital Lease Signing',
              'Verified Listings',
              'Smart Search',
              '24/7 Support'
            ].map((tag, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-ocean-blue/20 shadow-soft"
              >
                <CheckCircle className="w-4 h-4 text-success-green" />
                <span className="text-sm font-medium text-foreground">{tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-ocean-blue to-success-green text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Find Your Dream Home?
          </h2>
          <p className="text-xl sm:text-2xl mb-8 text-white/90">
            Join thousands of South Africans who've found their perfect rental through SwiftRent
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => navigate('/properties')}
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white hover:text-ocean-blue backdrop-blur-sm px-8 py-4 text-lg rounded-2xl"
            >
              Browse Properties
            </Button>
            {!user && (
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-white text-ocean-blue hover:bg-white/90 px-8 py-4 text-lg rounded-2xl"
              >
                Sign Up Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
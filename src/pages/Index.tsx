import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import { MoreFiltersModal } from "@/components/search/MoreFiltersModal";
import { usePropertySearchFilters } from "@/hooks/usePropertySearchFilters";
import { useAuth } from "@/hooks/useAuth";
import HowItWorks from "@/components/HowItWorks";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { Footer } from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { 
  Shield, 
  CheckCircle, 
  Lock, 
  Wrench, 
  Calendar, 
  Users,
  Home,
  TrendingUp,
  ArrowRight,
  Star,
  Award,
  UserCheck,
  MessageSquare,
  Search,
  MapPin,
  Smartphone,
  Zap,
  LayoutDashboard,
  Calculator,
  ShoppingBag,
  Layers
} from "lucide-react";
import heroBackground from "@/assets/hero-background-new.jpg";

// Simple R icon for South African Rand
const RIcon = ({ className }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>
);
// AnimatedCounter component for stats
const AnimatedCounter = ({ from = 0, to, duration = 1200 }: { from?: number; to: number; duration?: number }) => {
  const [count, setCount] = useState(from);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById(`counter-${to}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [to]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    const startValue = from;
    const endValue = to;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.round(startValue + (endValue - startValue) * easeOutQuart);

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, from, to, duration]);

  return <span id={`counter-${to}`}>{count.toLocaleString()}</span>;
};

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { filters, updateFilters, executeSearch, clearFilters } = usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
  };

  const handleSearch = () => {
    executeSearch();
  };

  // Features data
  const features = [
    {
      icon: RIcon,
      title: "Commission-Free Renting",
      description: "Renting the way it should be! Stop paying agents thousands. With RentLekker, you keep 100% of your rental income always.",
      gradient: "from-success-green to-success-green-glow"
    },
    {
      icon: Smartphone,
      title: "State-of-the-Art Platform",
      description: "Cutting-edge tech built for landlords and tenants: smart dashboards, digital leases, e-signatures",
      gradient: "from-ocean-blue to-ocean-blue-glow"
      },
      {
        icon: Zap,
        title: "Speed & Simplicity",
        description: "List, screen, and sign in minutes. No delays, no middlemen just fast, simple renting.",
        gradient: "from-purple-500 to-purple-600"
      },
      {
        icon: LayoutDashboard,
        title: "All-in-One Dashboard",
        description: "Manage listings, leases, rent, maintenance and even accounting from one clean dashboard.",
        gradient: "from-orange-500 to-orange-600"
      },
      {
        icon: Calculator,
        title: "Built-In Accounting & Invoices",
        description: "RentLekker generates professional invoices, saving you time and giving you peace of mind.",
        gradient: "from-teal-500 to-teal-600"
      },
    {
      icon: Shield,
      title: "Safety & Trust",
      description: "Verified users. Credit-checked tenants. Legally binding contracts. Your rental, secured.",
      gradient: "from-red-500 to-red-600"
    },
    {
      icon: MessageSquare,
      title: "Seamless On-Board Communication",
      description: "Landlords and tenants can chat, share documents, and track updates directly inside RentLekker no lost WhatsApps, no messy email chains. Everything in one secure place.",
      gradient: "from-indigo-500 to-indigo-600"
    },
    {
      icon: Layers,
      title: "Unlimited Property Management",
      description: "RentLekker lets you manage one property or a hundred with ease scalable, simple, and hassle-free.",
      gradient: "from-amber-400 to-amber-600"
    }
  ];

  // Featured properties using the existing format
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

 // Stats removed per request
 const stats: never[] = [];


  return (
    <div className="min-h-screen">
      {/* Hero Section - Updated Design with extra bottom padding for mobile */}
        <section className="relative w-full h-[500px] md:h-[600px] transition-all duration-300 pb-16 md:pb-0">
          {/* Background Image */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: 'url(/hero1.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                transform: 'scale(1)',
                transformOrigin: 'center'
              }}
            />

            {/* Heading - Aligned to left */}
            <div className="relative z-10 flex flex-col items-start justify-center h-full px-8 md:px-16 lg:px-24">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 text-left max-w-2xl">
                Safe, Simple,<br />
                <span className="text-blue-400">Commission-Free</span> Renting
              </h1>
            </div>
          
          {/* Chat Button */}
          <button 
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 text-primary-foreground fixed h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 transition-none" 
            type="button" 
            style={{ left: '350px', top: '466px', cursor: 'grab' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle h-6 w-6" aria-hidden="true">
              <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path>
            </svg>
          </button>
        </div>

        {/* Bottom fade effect with search bar - Positioned higher */}
        <div className="absolute bottom-0 left-0 right-0 pt-16 pb-12 bg-gradient-to-t from-gray-100 via-gray-100/70 via-60% to-transparent">
          <div className="relative z-10 w-full px-4 md:px-8 max-w-7xl mx-auto">
            <div className="w-full mx-auto">
              <Property24SearchBar
                onSearch={handleSearch}
                onFiltersChange={onFiltersChange}
                onMoreFiltersOpen={() => setShowMoreFilters(true)}
                filters={{
                  searchTerm: filters.searchTerm,
                  propertyType: filters.propertyType,
                  minPrice: filters.minPrice,
                  maxPrice: filters.maxPrice,
                  bedrooms: filters.bedrooms,
                  bathrooms: filters.bathrooms,
                  propertyTypes: filters.propertyTypes || [],
                  amenities: filters.amenities || [],
                  availableFrom: filters.availableFrom
                }}
                className="w-full shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>


      {/* Feature Highlights */}
      <section className="pt-16 md:pt-24 pb-8 md:pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose RentLekker?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The complete rental platform designed for South African landlords and tenants
          </p>
        </div>

         {/* Mobile: cards fading in one by one */}
        <div className="md:hidden space-y-6">
            {features.map((feature, index) => (
              <div 
              key={index} 
              className="animate-fade-in"
              style={{ 
                animationDelay: `${index * 300}ms`,
                animationFillMode: 'forwards'
              }}
            >
               <Card className="text-center bg-white/10 border border-white/20 shadow-lg transition-all duration-300 hover:shadow-xl animate-float-slow">
              <CardContent className="p-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform duration-300 hover:scale-110`}>
                <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
        </div>

        {/* Desktop/Tablet: responsive grid for 7 cards */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="text-center bg-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-8">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Safe Renting Section removed by request */}

      {/* How It Works Section */}
      <section id="how-it-works" className="pt-6 md:pt-8 pb-4 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HowItWorks />
        </div>
      </section>

      {/* Featured Properties */}
      <section className="pt-4 md:pt-6 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover verified properties from trusted landlords across South Africa
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredProperties.map((property) => (
            <PropertyCard 
              key={property.id} 
              {...property}
            />
          ))}
        </div>

        <div className="text-center">
          <Button 
            asChild 
            size="lg"
            className="bg-gradient-to-r from-ocean-blue to-success-green hover:from-ocean-blue-dark hover:to-success-green-dark text-white rounded-xl px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Link to="/properties" className="flex items-center gap-2">
              View All Properties
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* Final CTA Block */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-ocean-blue to-success-green text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Rent Smarter. Rent Safer.<br />
            <span className="text-white/90">With RentLekker.</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join South Africa's most trusted rental platform today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg" 
              className="bg-white text-ocean-blue-dark hover:bg-white/95 rounded-xl px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <Link to="/enhancedlandlorddashboard">Landlord Dashboard</Link>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="outline"
              className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 rounded-xl px-8 py-4 text-lg font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/enhancedtenantdashboard">Tenant Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* More Filters Modal */}
      <MoreFiltersModal
        open={showMoreFilters}
        onClose={() => setShowMoreFilters(false)}
        filters={{
          amenities: filters.amenities,
          bathrooms: filters.bathrooms,
          availableFrom: filters.availableFrom
        }}
        onFiltersChange={onFiltersChange}
        onClearFilters={clearFilters}
        onApplyFilters={handleSearch}
      />
    </div>
  );
};

export default Index;
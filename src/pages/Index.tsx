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

  // Featured properties will be loaded from the API

  // Stats removed per request
  const stats: never[] = [];

  // Add styles for the hero image
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .hero-image {
          transform: scale(1.1) !important;
          background-position: 30% 50% !important;
          background-size: cover !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          object-position: left center;
          margin-left: -15%;
        }
        .hero-section {
          position: relative;
          overflow: hidden;
          min-height: 60vh;
        }
      }
      @media (min-width: 769px) {
        .hero-image {
          transform: scale(1.1);
          transform-origin: center;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  return (
    <div className="min-h-screen">
      {/* Hero Section - Simplified Design */}
      <section className="relative w-full h-auto md:h-[70vh] min-h-[500px] flex flex-col hero-section">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
          <div
            className="absolute inset-0 w-full h-full bg-cover bg-center hero-image"
            style={{
              backgroundImage: 'url(/hero3.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: '100%',
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-transparent" />
        </div>

        {/* Content Overlay - Desktop */}
        <div className="hidden md:flex flex-1 flex-col justify-center px-4 z-10 pt-24 pb-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              <span className="inline-block mr-2">Safe, Simple,</span>
              <span className="text-blue-300">Commission-Free</span>
              <span className="inline-block ml-2">Renting</span>
            </h1>
          </div>

          {/* Search Bar Section - Desktop */}
          <div className="w-full px-4 md:px-8 max-w-4xl mx-auto">
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
              className="w-full shadow-lg relative z-20"
            />
          </div>
        </div>

        {/* Mobile Layout with Fade */}
        <div className="md:hidden flex-1 flex flex-col">
          {/* Fade in heading at the top */}
          <div className="animate-fade-in px-4 pt-6 pb-2 bg-white w-full text-center shadow-md">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="block">Safe, Simple,</span>
              <span className="text-ocean-blue">Commission-Free</span>
              <span className="block">Renting</span>
            </h1>
          </div>
          
          {/* Fade in white block with search bar */}
          <div className="animate-fade-in flex-1 flex flex-col" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
            <div className="bg-white rounded-t-3xl pt-4 pb-6 px-4 shadow-2xl flex-1">
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
                className="w-full text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights - Moved up */}
      <section className="bg-white py-12 md:py-16 px-4 sm:px-6 lg:px-8">
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
          <div className="text-center py-8 text-muted-foreground">
            <p>Featured properties coming soon</p>
          </div>
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
              <Link to="/landlord/dashboard">Landlord Dashboard</Link>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="outline"
              className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 rounded-xl px-8 py-4 text-lg font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/tenant/dashboard">Tenant Dashboard</Link>
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
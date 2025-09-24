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
import { SafeRentingSection } from "@/components/SafeRentingSection";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { Footer } from "@/components/Footer";
import PropertyCard from "@/components/PropertyCard";
import { 
  Shield, 
  CheckCircle, 
  Lock, 
  Wrench, 
  DollarSign, 
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
  Calculator
} from "lucide-react";
import heroBackground from "@/assets/hero-background-new.jpg";

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
      icon: DollarSign,
      title: "Commission-Free Renting",
      description: "Renting the way it should be! Stop paying agents thousands. With SwiftRent, you keep 100% of your rental income always.",
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
      title: "Built-In Accounting & Tax Invoices",
      description: "SwiftRent generates professional tax invoices, saving you time and giving you peace of mind.",
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
      description: "Landlords and tenants can chat, share documents, and track updates directly inside SwiftRent no lost WhatsApps, no messy email chains. Everything in one secure place.",
      gradient: "from-indigo-500 to-indigo-600"
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
    <div className="min-h-screen bg-gradient-to-br from-foreground/80 to-muted-foreground/80">
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(33, 79, 197, 0.8), rgba(34, 197, 94, 0.8)), url(${heroBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-96 h-96 bg-success-green/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-16 sm:pt-8">
          {/* Hero Content */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Safe, Simple,<br />
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                Commission-Free
              </span><br />
              Renting
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Direct landlord-tenant connections with full verification and peace of mind
            </p>
            
            {/* CTA Buttons removed per request */}
          </div>

          {/* Search Module wrapper removed; keep only the search bar */}
          <div className="max-w-4xl mx-auto">
            <Property24SearchBar
              onSearch={handleSearch}
              onFiltersChange={onFiltersChange}
              onMoreFiltersOpen={() => setShowMoreFilters(true)}
              filters={filters}
            />
          </div>

          {/* Quick Stats removed per request */}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Why Choose SwiftRent?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
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
              <Card className="text-center bg-white/10 border border-white/20 shadow-lg transition-all duration-300 hover:shadow-xl">
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

      {/* Safe Renting Section */}
      <SafeRentingSection />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HowItWorks />
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Featured Properties
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
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
            <span className="text-white/90">With SwiftRent.</span>
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
              <Link to="/auth">Join as Landlord</Link>
            </Button>
            <Button 
              asChild
              size="lg"
              className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 rounded-xl px-8 py-4 text-lg font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Link to="/auth">Join as Tenant</Link>
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
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={clearFilters}
        onApplyFilters={handleSearch}
      />
    </div>
  );
};

export default Index;
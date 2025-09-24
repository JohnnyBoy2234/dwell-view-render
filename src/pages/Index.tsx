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
  MapPin
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
      title: "No Commission",
      description: "Save thousands by cutting out agent fees. Connect directly with landlords and tenants.",
      gradient: "from-success-green to-success-green-glow"
    },
    {
      icon: UserCheck,
      title: "Verified & Secure",
      description: "ID & email verification for all users. Safe messaging and verified listings only.",
      gradient: "from-ocean-blue to-ocean-blue-glow"
    },
    {
      icon: Shield,
      title: "Safe Renting",
      description: "Built-in trust with transparent processes and protected digital agreements.",
      gradient: "from-earth-warm to-earth-warm"
    },
    {
      icon: Wrench,
      title: "Maintenance Manager",
      description: "Track and resolve property issues online with our integrated maintenance system.",
      gradient: "from-muted-foreground to-muted"
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

  const stats = [
    { label: "Active Listings", value: 2500, icon: Home },
    { label: "Happy Tenants", value: 1200, icon: Users },
    { label: "Verified Landlords", value: 850, icon: Award },
    { label: "5-Star Reviews", value: 4.8, icon: Star, isRating: true }
  ];

  return (
    <div className="min-h-screen">
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
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-16">
              <Button 
                asChild 
                size="lg" 
                className="bg-white text-ocean-blue-dark hover:bg-white/95 rounded-xl px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <Link to="/list-property">List Your Property</Link>
              </Button>
              <Button 
                asChild 
                size="lg" 
                className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 rounded-xl px-8 py-4 text-lg font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link to="/properties">Find Rental</Link>
              </Button>
            </div>
          </div>

          {/* Search Module */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Search className="h-6 w-6 text-white" />
                <h2 className="text-xl font-semibold text-white">Find Your Perfect Rental</h2>
              </div>
              <div className="space-y-4">
                <Property24SearchBar
                  onSearch={handleSearch}
                  onFiltersChange={onFiltersChange}
                  onMoreFiltersOpen={() => setShowMoreFilters(true)}
                  filters={filters}
                />
                <div className="flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <MapPin className="h-3 w-3 mr-1" />
                    Cape Town
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <MapPin className="h-3 w-3 mr-1" />
                    Johannesburg
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    <MapPin className="h-3 w-3 mr-1" />
                    Durban
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {user && (
            <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">2,500+</div>
                <div className="text-white/80">Active Listings</div>
              </div>
              <div className="hidden sm:block w-px h-12 bg-white/30"></div>
              <div className="text-center">
                <div className="text-2xl font-bold">1,200+</div>
                <div className="text-white/80">Happy Tenants</div>
              </div>
              {isAdmin && (
                <>
                  <div className="hidden sm:block w-px h-12 bg-white/30"></div>
                  <Button 
                    asChild
                    variant="outline" 
                    className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                  >
                    <Link to="/admin/dashboard">Admin Panel</Link>
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why Choose SwiftRent?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The complete rental platform designed for South African landlords and tenants
          </p>
        </div>

        {/* Mobile: horizontal swipeable cards */}
        <div className="md:hidden -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
            {features.map((feature, index) => (
              <div key={index} className="w-[calc(100vw-2rem)] snap-center shrink-0">
                <Card className="text-center border-0 shadow-lg transition-all duration-300 aspect-square">
                  <CardContent className="p-5 h-full flex flex-col items-center justify-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop/Tablet: original grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
      <section id="how-it-works" className="py-16 md:py-24 bg-gradient-to-br from-muted/20 to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <HowItWorks />
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
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

      {/* Success Stats */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-ocean-blue/5 to-success-green/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted Across South Africa
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of satisfied landlords and tenants
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-ocean-blue to-success-green rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <stat.icon className="h-10 w-10 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {stat.isRating ? (
                    <span>{stat.value}</span>
                  ) : (
                    <AnimatedCounter to={stat.value} />
                  )}
                  {stat.isRating && <Star className="inline h-6 w-6 text-earth-warm fill-current ml-1" />}
                </div>
                <div className="text-muted-foreground font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
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
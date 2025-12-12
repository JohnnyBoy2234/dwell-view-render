import { useState, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next"
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
import { Shield, CheckCircle, Lock, Wrench, Calendar, Users, Home, TrendingUp, ArrowRight, Star, Award, UserCheck, MessageSquare, Search, MapPin, Smartphone, Zap, LayoutDashboard, Calculator, ShoppingBag, Layers } from "lucide-react";
import heroBackground from "@/assets/hero-background-new.jpg";

// Simple R icon for South African Rand
const RIcon = ({
  className
}: {
  className?: string;
}) => <div className={`${className} flex items-center justify-center font-bold text-lg`}>
    R
  </div>;
// AnimatedCounter component for stats
const AnimatedCounter = ({
  from = 0,
  to,
  duration = 1200
}: {
  from?: number;
  to: number;
  duration?: number;
}) => {
  const [count, setCount] = useState(from);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, {
      threshold: 0.1
    });
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
  const {
    user,
    isAdmin
  } = useAuth();
  const {
    filters,
    updateFilters,
    executeSearch,
    clearFilters
  } = usePropertySearchFilters();
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const onFiltersChange = (patch: Partial<typeof filters>) => {
    updateFilters(patch);
  };
  const handleSearch = () => {
    executeSearch();
  };

  // Features data
  const features = [{
    icon: RIcon,
    title: "Commission-Free Renting",
    description: "Renting the way it should be! Stop paying agents thousands. With RentLekker, you keep 100% of your rental income always.",
    gradient: "from-success-green to-success-green-glow"
  }, {
    icon: Smartphone,
    title: "State-of-the-Art Platform",
    description: "Cutting-edge tech built for landlords and tenants: smart dashboards, digital leases, e-signatures",
    gradient: "from-ocean-blue to-ocean-blue-glow"
  }, {
    icon: Zap,
    title: "Speed & Simplicity",
    description: "List, screen, and sign in minutes. No delays, no middlemen just fast, simple renting.",
    gradient: "from-purple-500 to-purple-600"
  }, {
    icon: LayoutDashboard,
    title: "All-in-One Dashboard",
    description: "Manage listings, leases, rent, maintenance and even accounting from one clean dashboard.",
    gradient: "from-orange-500 to-orange-600"
  }, {
    icon: Calculator,
    title: "Built-In Accounting & Invoices",
    description: "RentLekker generates professional invoices, saving you time and giving you peace of mind.",
    gradient: "from-teal-500 to-teal-600"
  }, {
    icon: Shield,
    title: "Safety & Trust",
    description: "Verified users. Credit-checked tenants. Legally binding contracts. Your rental, secured.",
    gradient: "from-red-500 to-red-600"
  }, {
    icon: MessageSquare,
    title: "Seamless On-Board Communication",
    description: "Landlords and tenants can chat, share documents, and track updates directly inside RentLekker no lost WhatsApps, no messy email chains. Everything in one secure place.",
    gradient: "from-indigo-500 to-indigo-600"
  }, {
    icon: Layers,
    title: "Unlimited Property Management",
    description: "RentLekker lets you manage one property or a hundred with ease scalable, simple, and hassle-free.",
    gradient: "from-amber-400 to-amber-600"
  }];

  // Featured properties will be loaded from the API

  // Stats removed per request
  const stats: never[] = [];

  // Add styles for the hero section with fades
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .top-fade {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: auto;
        min-height: 40%;
        background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0) 100%);
        z-index: 5;
        display: flex;
        align-items: flex-start;
        padding: 1.5rem 0.5rem;
        padding-top: 0.75rem;
      }
      @media (min-width: 768px) {
        .top-fade {
          justify-content: flex-start;
          padding-left: 2.5rem;
        }
      }
      .hero-content {
        position: relative;
        z-index: 10;
      }
      .hero-heading {
        text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        color: white;
        font-weight: 700;
        letter-spacing: -0.5px;
      }
      @media (max-width: 768px) {
        .hero-image {
          transform: scale(1.0) !important;
          background-position: center 25% !important;
          height: 100% !important;
          top: 0;
        }
        .hero-section {
          position: relative;
          overflow: hidden;
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
  return <div className="min-h-screen">
      {/* Hero Section with Glass Heading */}
      <section className="relative">
        <div className="relative w-full h-[60vh] min-h-[500px] md:h-[70vh]">
          <div className="absolute inset-0 w-full h-full">
            <img src="/hero3.jpg" alt="Modern apartment building" className="w-full h-full object-cover" />
          </div>
          
          {/* Bottom Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
          
          {/* Top Fade with Heading */}
          <div className="top-fade my-0 justify-start pl-3 md:pl-10">
            <div className="max-w-xl mt-4 md:mt-8 lg:mt-8">
              <h1 className="text-2xl md:text-4xl font-bold text-white text-left leading-tight">
                <span className="block">Safe, Simple,</span>
                <span className="block text-ocean-blue">Commission-Free</span>
                <span className="block">Renting</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Search Bar - Fading into white */}
        <div className="relative z-10 w-full px-4 -mt-20 md:-mt-24 mb-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:bg-white px-0 py-0">
              <Property24SearchBar onSearch={handleSearch} onFiltersChange={onFiltersChange} onMoreFiltersOpen={() => setShowMoreFilters(true)} filters={{
              searchTerm: filters.searchTerm,
              propertyType: filters.propertyType,
              minPrice: filters.minPrice,
              maxPrice: filters.maxPrice,
              bedrooms: filters.bedrooms,
              bathrooms: filters.bathrooms,
              propertyTypes: filters.propertyTypes || [],
              amenities: filters.amenities || [],
              availableFrom: filters.availableFrom
            }} className="w-full my-[15px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights - Moved up */}
      <section className="bg-white pt-8 md:pt-10 pb-12 md:pb-16 px-4 sm:px-6 lg:px-8">
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
            {features.map((feature, index) => <div key={index} className="animate-fade-in" style={{
          animationDelay: `${index * 300}ms`,
          animationFillMode: 'forwards'
        }}>
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
              </div>)}
        </div>

        {/* Desktop/Tablet: responsive grid for 7 cards */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => <Card key={index} className="text-center bg-white/10 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
            </Card>)}
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
          <Button asChild size="lg" className="bg-ocean-blue hover:bg-ocean-blue/90 text-white rounded-xl px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
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
      <section className="py-16 md:py-24 bg-ocean-blue text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            <span className="text-white/90">Rent Smarter. Rent Safer.</span><br />
            <span className="text-white">With RentLekker.</span>
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join South Africa's most trusted rental platform today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-ocean-blue-dark hover:bg-white/95 rounded-xl px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300">
              <Link to="/landlord/dashboard">Landlord Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-white/20 text-white border-2 border-white/40 hover:bg-white/30 rounded-xl px-8 py-4 text-lg font-semibold backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
              <Link to="/tenant/dashboard">Tenant Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* More Filters Modal */}
      <MoreFiltersModal open={showMoreFilters} onClose={() => setShowMoreFilters(false)} filters={{
      amenities: filters.amenities,
      bathrooms: filters.bathrooms,
      availableFrom: filters.availableFrom
    }} onFiltersChange={onFiltersChange} onClearFilters={clearFilters} onApplyFilters={handleSearch} />
    </div>;
};
export default Index;
import { Button } from "@/components/ui/button";
import "@/styles/animations.css";

import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";

import PropertyCard from "@/components/PropertyCard";
import { BenefitsSlider } from "@/components/BenefitsSlider";

import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";

import { ArrowRight, CheckCircle, Home } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import HowItWorks from "@/components/HowItWorks";

// Lightweight utilities for homepage motion without new deps
function useParallax() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMouseMove = (e: React.MouseEvent) => {
    const { currentTarget, clientX, clientY } = e;
    const rect = (currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2; // -1..1
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2; // -1..1
    setPos({ x, y });
  };
  return { pos, onMouseMove };
}

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

// 3D tilt helper (no deps)
function useTilt() {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rx = (0.5 - py) * 10; // rotateX
    const ry = (px - 0.5) * 10; // rotateY
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };
  return { onMove, onLeave };
}

// Magnetic hover helper (no deps)
function useMagnet(intensity = 12) {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    el.style.transform = `translate(${dx * intensity}px, ${dy * intensity}px)`;
  };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget as HTMLElement;
    el.style.transform = `translate(0, 0)`;
  };
  return { onMove, onLeave };
}

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

  const heroParallax = useParallax();

  const tilt = useTilt();
  const magnet = useMagnet();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Floating background particles */}
      <div className="bg-particles" />
      
      <div className="fixed inset-0 bg-gradient-to-br from-ocean-blue/[0.02] via-transparent to-success-green/[0.02] pointer-events-none z-[-1]" />
      
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/90 via-ocean-blue-dark/85 to-success-green/80" />
        {/* Aurora blobs */}
        <div className="home-aurora">
          <div className="blob --1" />
          <div className="blob --2" />
          <div className="blob --3" />
        </div>
        {/* Subtle Pattern Overlay */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-[70vh] sm:min-h-[80vh] lg:min-h-screen flex items-center justify-center" onMouseMove={heroParallax.onMouseMove}>
          <div
            className="text-center max-w-5xl mx-auto w-full"
            style={{
              transform: `perspective(1200px) translate3d(${heroParallax.pos.x * 6}px, ${heroParallax.pos.y * 6}px, 0)`,
              transition: 'transform 120ms ease-out',
            }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 mt-2 sm:mt-4 lg:mt-0 leading-tight reveal-up">
              <span className="block">Renting the way</span>
              <span className="block text-success-green">it should be</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-white/90 reveal-up" style={{ animationDelay: '100ms' }}>
              Find your perfect rental home in South Africa — connecting landlords and tenants directly with state-of-the-art technology. No agents. Zero commission. Full control.
            </p>

            {/* Property24-style Search Bar */}
            <div className="reveal-up" style={{ animationDelay: '200ms' }}>
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
            </div>

            {/* No Results Message in Hero Section */}
            {showNoResults && (
              <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 reveal-up" style={{ animationDelay: '300ms' }}>
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

            {/* Trust bullets */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-white/90 reveal-up" style={{ animationDelay: '350ms' }}>
              <div className="flex items-center"><CheckCircle className="h-5 w-5 mr-2" /><span>Direct Contact</span></div>
              <div className="flex items-center"><CheckCircle className="h-5 w-5 mr-2" /><span>No Commission</span></div>
              <div className="flex items-center"><CheckCircle className="h-5 w-5 mr-2" /><span>Verified Properties</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by + value props marquee */}
      <section className="py-6 bg-background/60 border-t border-b border-border/50">
        <div className="text-center text-sm text-muted-foreground mb-3">Trusted by renters and landlords across SA</div>
        <div className="home-marquee">
          <div className="home-marquee-track gap-8 px-4 sm:px-8">
            {Array.from({ length: 2 }).map((_, loop) => (
              <div className="flex gap-8 pr-8" key={loop}>
                {[
                  'Zero Commission',
                  'Secure Payments',
                  'Instant Messaging',
                  'Maintenance Manager',
                  'Digital Lease Signing',
                  'Verified Listings',
                  'Smart Search',
                ].map((tag) => (
                  <span key={`${loop}-${tag}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted text-foreground/80 border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-green" /> {tag}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose SwiftRent - Animated Feature Grid */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose SwiftRent</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A streamlined experience for tenants and landlords, packed with powerful features and a premium feel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Lightning-fast search',
                desc: 'Filter by location, budget, amenities and more with instant results.',
                icon: '🔎',
              },
              {
                title: 'Direct tenant ↔ landlord',
                desc: 'Chat in real-time with no middlemen or commission fees.',
                icon: '💬',
              },
              {
                title: 'Digital lease signing',
                desc: 'Legally binding e-signatures with full audit trails.',
                icon: '🖊️',
              },
              {
                title: 'Maintenance hub',
                desc: 'Create, track and resolve maintenance issues with built-in messaging.',
                icon: '🛠️',
              },
              {
                title: 'Secure payments',
                desc: 'Modern rails and automated receipts for peace of mind.',
                icon: '💳',
              },
              {
                title: 'Insights & reports',
                desc: 'Track applications, tenants, and performance at a glance.',
                icon: '📊',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className="relative feature-card tilt-card tilt-reset rounded-xl backdrop-blur-sm bg-white/80 dark:bg-black/20 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 p-6 reveal-up"
                style={{ animationDelay: `${100 + i * 80}ms` }}
                onMouseMove={tilt.onMove}
                onMouseLeave={tilt.onLeave}
              >
                <div className="feature-glow rounded-xl" />
                <div className="text-3xl mb-3 select-none" aria-hidden>{f.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground">{f.desc}</p>
              </div>
            ))}
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


      {/* Stats Section with animated counters */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2"><AnimatedCounter to={5000} />+</div>
              <div className="text-muted-foreground">Active Properties</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2"><AnimatedCounter to={15000} />+</div>
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
              <Button size="lg" variant="secondary" className="relative overflow-hidden">
                <span
                  className="magnet"
                  onMouseMove={magnet.onMove}
                  onMouseLeave={magnet.onLeave}
                >
                  Browse Properties
                </span>
              </Button>
            </Link>
            <Link to="/list-property">
              <Button size="lg" variant="outline" className="relative overflow-hidden text-white border-white/80 hover:bg-white hover:text-ocean-blue backdrop-blur-sm bg-white/10">
                <span
                  className="magnet"
                  onMouseMove={magnet.onMove}
                  onMouseLeave={magnet.onLeave}
                >
                  List Your Property
                </span>
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

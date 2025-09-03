import { Button } from "@/components/ui/button";
import "@/styles/animations.css";

import { Property24SearchBar } from "@/components/search/Property24SearchBar";
import {MoreFiltersModal} from "@/components/search/MoreFiltersModal";

import PropertyCard from "@/components/PropertyCard";
import { BenefitsSlider } from "@/components/BenefitsSlider";

import {
  usePropertySearchFilters,
} from "@/hooks/usePropertySearchFilters";

import { ArrowRight, CheckCircle, Home, Star, Zap } from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import { useEffect, useRef, useState } from "react";
import HowItWorks from "@/components/HowItWorks";
import { ThemeTagline } from "@/components/ui/ThemeTagline";
import { SectionHeader } from "@/components/ui/SectionHeader";

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50" />
        

      </div>
      
      {/* Hero Section */}
      <section className="relative text-white overflow-hidden">
        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-blue/90 via-ocean-blue-dark/85 to-success-green/80" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-[70vh] sm:min-h-[80vh] lg:min-h-screen flex items-center justify-center" onMouseMove={heroParallax.onMouseMove}>
          <div
            className="text-center max-w-5xl mx-auto w-full"
            style={{
              transform: `perspective(1200px) translate3d(${heroParallax.pos.x * 6}px, ${heroParallax.pos.y * 6}px, 0)`,
              transition: 'transform 120ms ease-out',
            }}
          >
            {/* Enhanced Title */}
            <div className="mb-4 reveal-up">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="block">Renting the way</span>
                <span className="block text-success-green">it should be</span>
              </h1>
            </div>
            
            <p className="text-lg md:text-xl mb-8 text-white/90 reveal-up" style={{ animationDelay: '100ms' }}>
              Find your perfect rental home in South Africa — connecting landlords and tenants directly with state-of-the-art technology. No agents. Zero commission. Full control.
            </p>

            {/* Glass Search Bar */}
            <div className="reveal-up" style={{ animationDelay: '200ms' }}>
              <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-1 shadow-2xl">
                <Property24SearchBar
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  onSearch={handleSearch}
                  onMoreFiltersOpen={() => setMoreFiltersOpen(true)}
                />
              </div>

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
              <div className="mt-6 p-4 backdrop-blur-xl bg-white/10 rounded-lg border border-white/20 reveal-up" style={{ animationDelay: '300ms' }}>
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
                      className="border-white/30 text-white hover:bg-white hover:text-ocean-blue backdrop-blur-sm"
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


          </div>
        </div>
      </section>

      {/* Trusted by + value props marquee */}
      <section className="py-6 backdrop-blur-xl bg-white/5 border-t border-b border-white/10">
        <div className="home-marquee">
          <div className="home-marquee-track gap-8 px-4 sm:px-8">
            {Array.from({ length: 2 }).map((_, loop) => (
              <div className="flex gap-8 pr-8" key={loop}>
                {[
                  'No Agent Commission',
                  'Secure Payments',
                  'Instant Messaging',
                  'Maintenance Manager',
                  'No Agent Commission',
                  'Digital Lease Signing',
                  'Verified Listings',
                  'Smart Search',
                  'No Agent Commission',
                  'Secure Payments',
                  'Instant Messaging',
                  'Maintenance Manager',
                  'No Agent Commission',
                  'No Agents',
                  'Digital Lease Signing',
                  'Verified Listings',
                  'Smart Search',
                ].map((tag, index) => {
                  const isBlueItem = tag === 'No Agent Commission' || tag === 'No Agents';
                  
                  return (
                    <span 
                      key={`${loop}-${tag}-${index}`} 
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl text-foreground/80 border transition-colors duration-300 ${
                        isBlueItem 
                          ? 'bg-ocean-blue text-white border-ocean-blue hover:bg-ocean-blue-dark' 
                          : 'bg-white/10 border-gray-300/50 hover:bg-white/20'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-success-green" /> 
                      {tag}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SwiftRent - Enhanced Feature Grid with Glass Cards */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Why SwiftRent"
            subtitle="Complete property management solution from initial listing to ongoing maintenance - everything you need in one powerful platform."
            showTagline={false}
            taglineVariant="eyebrow"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                title: 'Tenant Applications and Screening',
                desc: [
                  'Online tenant application submission form capturing personal info, employment, rental history',
                  'Automated credit and background checks integration',
                  'Reference and employment verification',
                  'Risk assessment and scoring system for applicant suitability',
                  'Application status tracking and communication hub'
                ],
                icon: '👥',
                gradient: 'from-blue-500/20 to-indigo-500/20',
                border: 'border-blue-500/30',
                iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-600',
              },
              {
                title: 'Viewings and Scheduling',
                desc: [
                  'Calendaring system for property viewings',
                  'Tenants and agents can book viewing times via shared calendar slots',
                  'Automated notifications and reminders sent to tenants and landlords',
                  'Viewing history and follow-up management'
                ],
                icon: '📅',
                gradient: 'from-green-500/20 to-emerald-500/20',
                border: 'border-green-500/30',
                iconBg: 'bg-gradient-to-br from-green-500 to-emerald-600',
              },
              {
                title: 'Compliance and LeasePack Management',
                desc: [
                  'Storage and easy retrieval of compliance certificates (electrical, safety, etc)',
                  'Digital lease agreement signing and stamping',
                  'License, certification, and legal document management',
                  'Tenant access to lease documents and compliance info',
                  'Alerts for expiring certificates or renewal requirements'
                ],
                icon: '📋',
                gradient: 'from-purple-500/20 to-violet-500/20',
                border: 'border-purple-500/30',
                iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
              },
              {
                title: 'Maintenance Management',
                desc: [
                  'Tenant maintenance request submission portal',
                  'Ticket management with tracking status (open, in progress, resolved)',
                  'Coordination with maintenance teams and vendors',
                  'Maintenance cost tracking and history logs',
                  'Emergency maintenance alert system'
                ],
                icon: '🔧',
                gradient: 'from-orange-500/20 to-red-500/20',
                border: 'border-orange-500/30',
                iconBg: 'bg-gradient-to-br from-orange-500 to-red-600',
              },
              {
                title: 'Property Portfolio Management',
                desc: [
                  'Comprehensive dashboard for managing multiple properties',
                  'Financial tracking with rent collection and expense monitoring',
                  'Tenant communication hub with integrated messaging',
                  'Document storage and organization system',
                  'Performance analytics and reporting tools'
                ],
                icon: '🏢',
                gradient: 'from-cyan-500/20 to-teal-500/20',
                border: 'border-cyan-500/30',
                iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
              },
              {
                title: 'Smart Notifications & Alerts',
                desc: [
                  'Real-time notifications for applications, maintenance requests, and lease renewals',
                  'Automated reminders for rent payments and document expiry',
                  'Customizable alert preferences for different user types',
                  'Multi-channel communication via email, SMS, and in-app notifications'
                ],
                icon: '🔔',
                gradient: 'from-pink-500/20 to-rose-500/20',
                border: 'border-pink-500/30',
                iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className={`group relative p-8 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02] reveal-up hover:bg-white/20 h-full flex flex-col`}
                style={{ animationDelay: `${100 + i * 120}ms` }}
                onMouseMove={tilt.onMove}
                onMouseLeave={tilt.onLeave}
              >
                {/* Enhanced glass effect overlay */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl" />
                
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Content */}
                <div className="relative z-10 flex gap-6 flex-1">
                  {/* Enhanced Icon */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-xl ${feature.iconBg} flex items-center justify-center text-2xl text-white transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {feature.icon}
                  </div>
                  
                  {/* Text content */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <ul className="text-muted-foreground leading-relaxed text-sm space-y-1 flex-1">
                      {feature.desc.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-primary mr-2 mt-1">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Subtle inner glow */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorks />

      {/* Featured Properties with Glass Cards */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Featured Properties"
            subtitle="Discover handpicked properties across South Africa's major cities"
            showTagline={false}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProperties.map((property) => (
              <div key={property.id} className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
                <PropertyCard {...property} />
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link to="/properties">
              <Button size="lg" variant="outline" className="backdrop-blur-xl bg-white/10 border-white/20 hover:bg-white/20 text-foreground">
                View All Properties
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section with animated counters and glass cards */}
      <section className="py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: 5000, label: "Active Properties", icon: Home },
              { number: 15000, label: "Happy Tenants", icon: Star },
              { number: 98, label: "Success Rate", icon: CheckCircle, suffix: "%" },
              { number: 24, label: "Support", icon: Zap, suffix: "/7" }
            ].map((stat, i) => (
              <div key={stat.label} className="text-center backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 hover:scale-105">
                <div className="text-4xl font-bold text-primary mb-2 flex items-center justify-center gap-2">
                  {stat.icon && <stat.icon className="h-8 w-8 text-primary/60" />}
                  <span>
                    {stat.number !== 98 ? <AnimatedCounter to={stat.number} /> : stat.number}
                    {stat.suffix}
                  </span>
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with enhanced glass effects */}
      <section className="py-20 bg-gradient-to-br from-ocean-blue via-ocean-blue-light to-success-green text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Next Home?</h2>
          <p className="text-xl mb-8 text-white/90">
            Join thousands of satisfied customers who found their perfect rental through SwiftRent
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/properties">
              <Button size="lg" variant="secondary" className="relative overflow-hidden backdrop-blur-xl bg-white/20 border border-white/30 hover:bg-white/30 text-ocean-blue">
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
              <Button size="lg" variant="outline" className="relative overflow-hidden text-white border-white/80 hover:bg-white hover:text-ocean-blue backdrop-blur-xl bg-white/10">
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

      {/* Footer with glass effect */}
      <footer className="backdrop-blur-xl bg-white/5 border-t border-white/10 py-12">
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
                <li><Link to="/properties" className="hover:text-primary transition-colors duration-300">Browse Properties</Link></li>
                <li><Link to="/how-it-works" className="hover:text-primary transition-colors duration-300">How It Works</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors duration-300">Rental Tips</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">For Landlords</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors duration-300">List Property</a></li>
                <li><a href="#" className="hover:text-primary transition-colors duration-300">Pricing Guide</a></li>
                <li><a href="#" className="hover:text-primary transition-colors duration-300">Landlord Resources</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><Link to="/about" className="hover:text-primary transition-colors duration-300">About Us</Link></li>
                <li><a href="#" className="hover:text-primary transition-colors duration-300">Contact</a></li>
                <li><a href="#" className="hover:text-primary transition-colors duration-300">Help Center</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 SwiftRent. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
